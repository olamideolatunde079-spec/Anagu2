import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../redis/redis.service';

export const RATE_LIMIT_KEY = 'anagu_rate_limit';

export interface RateLimitOptions {
  max: number;
  windowSeconds: number;
}

export const RateLimit = (max: number, windowSeconds = 60) =>
  SetMetadata(RATE_LIMIT_KEY, { max, windowSeconds } satisfies RateLimitOptions);

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) ?? { max: 120, windowSeconds: 60 };

    const req = context.switchToHttp().getRequest();
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const route = `${req.method}:${req.route?.path ?? req.url}`;
    const key = `rl:${route}:${String(ip)}`;

    const count = await this.redis.incrementRateLimit(key, options.windowSeconds);
    if (count > options.max) {
      throw new HttpException(
        `Rate limit exceeded. Try again after ${options.windowSeconds}s.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
