import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './entities/user.entity';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(
    email: string,
    password: string,
    fullName: string,
    nationalId?: string,
    walletAddress?: string,
    phone?: string,
  ): Promise<{ user: Omit<User, 'passwordHash'>; accessToken: string }> {
    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = this.userRepo.create({
      email,
      passwordHash,
      fullName,
      role: UserRole.CITIZEN,
      nationalId: nationalId ?? null,
      phone: phone ?? null,
      walletAddress: walletAddress ?? null,
    });
    await this.userRepo.save(user);

    const accessToken = this.generateToken(user);
    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser as Omit<User, 'passwordHash'>, accessToken };
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepo.findOne({ where: { email, isActive: true } });
    if (!user?.passwordHash) return null;
    const valid = await bcrypt.compare(password, user.passwordHash);
    return valid ? user : null;
  }

  login(user: User): { accessToken: string; user: Omit<User, 'passwordHash'> } {
    const accessToken = this.generateToken(user);
    const { passwordHash: _, ...safeUser } = user;
    return { accessToken, user: safeUser as Omit<User, 'passwordHash'> };
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  private generateToken(user: User): string {
    return this.jwtService.sign({
      sub:   user.id,
      email: user.email,
      role:  user.role,
    });
  }
}
