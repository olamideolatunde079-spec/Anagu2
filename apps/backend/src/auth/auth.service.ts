import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User, UserRole } from './entities/user.entity';
import { AuthSession } from './entities/auth-session.entity';
import { AuditService } from '../audit/audit.service';
import { RedisService } from '../common/redis/redis.service';

const BCRYPT_ROUNDS = 10;
const REFRESH_TTL_DAYS = 14;

export interface SessionMeta {
  deviceId?: string;
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(AuthSession) private readonly sessionRepo: Repository<AuthSession>,
    private readonly jwtService: JwtService,
    @Optional() private readonly auditService?: AuditService,
    @Optional() private readonly redisService?: RedisService,
  ) {}

  async register(
    email: string,
    password: string,
    fullName: string,
    nationalId?: string,
    walletAddress?: string,
    phone?: string,
    meta?: SessionMeta,
  ): Promise<{ user: Omit<User, 'passwordHash'>; accessToken: string; refreshToken: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await this.userRepo.findOne({ where: { email: normalizedEmail } });
    if (existing) throw new ConflictException('Email already registered');

    if (nationalId) {
      const existingNin = await this.userRepo.findOne({ where: { nationalId } });
      if (existingNin) throw new ConflictException('National ID already registered');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = this.userRepo.create({
      email: normalizedEmail,
      passwordHash,
      fullName: fullName.trim(),
      phone: phone ?? null,
      role: UserRole.CITIZEN,
      nationalId: nationalId ?? null,
      walletAddress: walletAddress ?? null,
      authProvider: 'LOCAL',
    });
    await this.userRepo.save(user);

    const accessToken = this.generateToken(user);
    const refreshToken = await this.createRefreshSession(user.id, meta);

    await this.auditService?.log({
      entityType: 'user',
      entityId: user.id,
      eventType: 'USER_REGISTERED',
      fromStatus: null,
      toStatus: 'ACTIVE',
      actorRole: user.role,
      actorId: user.id,
      actorAddress: user.walletAddress ?? undefined,
      ipAddress: meta?.ipAddress,
    });

    return { user: this.sanitizeUser(user), accessToken, refreshToken };
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.userRepo.findOne({ where: { email: normalizedEmail, isActive: true } });
    if (!user?.passwordHash) return null;
    const valid = await bcrypt.compare(password, user.passwordHash);
    return valid ? user : null;
  }

  async login(
    user: User,
    meta?: SessionMeta,
  ): Promise<{ accessToken: string; refreshToken: string; user: Omit<User, 'passwordHash'> }> {
    await this.userRepo.update(user.id, { lastLoginAt: new Date() });
    const accessToken = this.generateToken(user);
    const refreshToken = await this.createRefreshSession(user.id, meta);

    await this.auditService?.log({
      entityType: 'user',
      entityId: user.id,
      eventType: 'USER_LOGIN',
      actorRole: user.role,
      actorId: user.id,
      actorAddress: user.walletAddress ?? undefined,
      ipAddress: meta?.ipAddress,
      metadata: { deviceId: meta?.deviceId ?? null },
    });

    return { accessToken, refreshToken, user: this.sanitizeUser(user) };
  }

  async refreshSession(
    refreshToken: string,
    meta?: SessionMeta,
  ): Promise<{ accessToken: string; refreshToken: string; user: Omit<User, 'passwordHash'> }> {
    const tokenHash = this.hashToken(refreshToken);
    const session = await this.sessionRepo.findOne({
      where: { refreshTokenHash: tokenHash, revokedAt: IsNull() },
    });

    if (!session || session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    const user = await this.userRepo.findOne({ where: { id: session.userId, isActive: true } });
    if (!user) {
      throw new UnauthorizedException('Account is inactive or no longer exists.');
    }

    // Rotate refresh token
    await this.sessionRepo.update(session.id, { revokedAt: new Date() });
    const nextRefreshToken = await this.createRefreshSession(user.id, meta);
    const accessToken = this.generateToken(user);

    return { accessToken, refreshToken: nextRefreshToken, user: this.sanitizeUser(user) };
  }

  async logout(userId: string, refreshToken?: string, tokenJti?: string): Promise<{ loggedOut: boolean }> {
    if (refreshToken) {
      await this.sessionRepo.update(
        { userId, refreshTokenHash: this.hashToken(refreshToken), revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
    } else {
      await this.sessionRepo.update(
        { userId, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
    }

    if (tokenJti) {
      await this.redisService?.set(`anagu:revoked_jwt:${tokenJti}`, '1', 86400);
    }

    await this.auditService?.log({
      entityType: 'user',
      entityId: userId,
      eventType: 'USER_LOGOUT',
      actorId: userId,
    });

    return { loggedOut: true };
  }

  async isTokenRevoked(jti: string): Promise<boolean> {
    if (!this.redisService) return false;
    const val = await this.redisService.get(`anagu:revoked_jwt:${jti}`);
    return val === '1';
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async getSafeProfile(id: string): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.findById(id);
    if (!user) throw new UnauthorizedException();
    return this.sanitizeUser(user);
  }

  sanitizeUser(user: User): Omit<User, 'passwordHash'> {
    const { passwordHash: _, ...safeUser } = user;
    return safeUser as Omit<User, 'passwordHash'>;
  }

  private async createRefreshSession(userId: string, meta?: SessionMeta): Promise<string> {
    const rawToken = crypto.randomBytes(48).toString('base64url');
    const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

    const session = this.sessionRepo.create({
      userId,
      refreshTokenHash: this.hashToken(rawToken),
      deviceId: meta?.deviceId ?? null,
      userAgent: meta?.userAgent ?? null,
      ipAddress: meta?.ipAddress ?? null,
      expiresAt,
    });
    await this.sessionRepo.save(session);
    return rawToken;
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private generateToken(user: User): string {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      jti: crypto.randomUUID(),
    });
  }
}
