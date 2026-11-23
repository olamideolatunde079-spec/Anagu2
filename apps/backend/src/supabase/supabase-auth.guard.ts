import {
  Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger,
} from '@nestjs/common';
import { SupabaseService } from './supabase.service';

/**
 * SupabaseAuthGuard
 *
 * Accepts Supabase JWTs from the web/mobile clients.
 * Validates against:
 *   https://wcykxpsbtbsoxxmitslk.supabase.co/auth/v1/.well-known/jwks.json
 *
 * Attach with @UseGuards(SupabaseAuthGuard) on any route that should
 * accept Supabase-issued tokens instead of (or in addition to) the
 * NestJS-issued JWT from the local auth module.
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);

  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers['authorization'];

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.slice(7);

    try {
      const user = await this.supabase.verifyToken(token);
      request.user = user; // attach to request for downstream use
      return true;
    } catch (err: any) {
      this.logger.warn(`Supabase token rejected: ${err.message}`);
      throw new UnauthorizedException('Invalid or expired Supabase token');
    }
  }
}
