import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UserRole } from './entities/user.entity';
import { resolveJwtSecret } from './jwt-secret.helper';

describe('AuthService & JWT Secret Security', () => {
  let service: AuthService;
  let userRepo: any;
  let sessionRepo: any;
  let jwtService: any;
  let auditService: any;
  let redisService: any;

  beforeEach(() => {
    userRepo = {
      findOne: jest.fn(),
      create: jest.fn((x) => ({ id: 'user-uuid-1', ...x })),
      save: jest.fn(async (x) => x),
      update: jest.fn(),
    };
    sessionRepo = {
      findOne: jest.fn(),
      create: jest.fn((x) => ({ id: 'sess-uuid-1', ...x })),
      save: jest.fn(async (x) => x),
      update: jest.fn(),
    };
    jwtService = {
      sign: jest.fn(() => 'signed.jwt.token'),
    } as unknown as JwtService;
    auditService = { log: jest.fn().mockResolvedValue({}) };
    redisService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };

    service = new AuthService(
      userRepo,
      sessionRepo,
      jwtService,
      auditService,
      redisService,
    );
  });

  it('registers a citizen, stores refresh session hash, and audits event', async () => {
    userRepo.findOne.mockResolvedValue(null);

    const res = await service.register(
      'Citizen@Example.COM',
      'StrongPass123!',
      'Chidi Nwankwo',
      'NIN-1122334455',
    );

    expect(res.accessToken).toBe('signed.jwt.token');
    expect(res.refreshToken).toBeDefined();
    expect(res.user.email).toBe('citizen@example.com');
    expect(res.user.role).toBe(UserRole.CITIZEN);
    expect((res.user as any).passwordHash).toBeUndefined();
    expect(sessionRepo.save).toHaveBeenCalledTimes(1);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'USER_REGISTERED' }),
    );
  });

  it('rejects duplicate email registration with ConflictException', async () => {
    userRepo.findOne.mockResolvedValueOnce({ id: 'existing-id', email: 'dup@test.ng' });
    await expect(
      service.register('dup@test.ng', 'Password123!', 'Test User'),
    ).rejects.toThrow(ConflictException);
  });

  it('rotates refresh token cleanly and revokes previous session', async () => {
    const validSession = {
      id: 'sess-1',
      userId: 'user-uuid-1',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
    };
    sessionRepo.findOne.mockResolvedValue(validSession);
    userRepo.findOne.mockResolvedValue({
      id: 'user-uuid-1',
      email: 'citizen@example.com',
      fullName: 'Chidi',
      role: UserRole.CITIZEN,
      isActive: true,
    });

    const res = await service.refreshSession('raw_valid_refresh_token_1234567890');
    expect(sessionRepo.update).toHaveBeenCalledWith(
      'sess-1',
      expect.objectContaining({ revokedAt: expect.any(Date) }),
    );
    expect(res.accessToken).toBe('signed.jwt.token');
    expect(res.refreshToken).toBeDefined();
  });

  it('rejects expired refresh tokens', async () => {
    sessionRepo.findOne.mockResolvedValue({
      id: 'sess-expired',
      userId: 'user-uuid-1',
      expiresAt: new Date(Date.now() - 10_000),
      revokedAt: null,
    });

    await expect(
      service.refreshSession('expired_token_12345678901234567890'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('blacklists JWT JTI in Redis and revokes sessions on logout', async () => {
    await service.logout('user-uuid-1', undefined, 'jti-abc');
    expect(sessionRepo.update).toHaveBeenCalled();
    expect(redisService.set).toHaveBeenCalledWith('anagu:revoked_jwt:jti-abc', '1', 86400);
  });

  it('throws in production when JWT_SECRET is missing or placeholder', () => {
    const prodConfig = {
      get: jest.fn((key: string, def?: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'JWT_SECRET') return 'CHANGE_ME_MIN_64_CHAR_RANDOM_JWT_SECRET';
        return def;
      }),
    } as unknown as ConfigService;

    expect(() => resolveJwtSecret(prodConfig)).toThrow();
  });
});
