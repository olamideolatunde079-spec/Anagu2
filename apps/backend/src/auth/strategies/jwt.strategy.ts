import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { resolveJwtSecret } from '../jwt-secret.helper';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  jti?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: resolveJwtSecret(config),
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.jti && (await this.authService.isTokenRevoked(payload.jti))) {
      throw new UnauthorizedException('Session has been revoked.');
    }
    const user = await this.authService.findById(payload.sub);
    if (!user || !user.isActive) throw new UnauthorizedException();
    return { ...user, tokenJti: payload.jti };
  }
}
