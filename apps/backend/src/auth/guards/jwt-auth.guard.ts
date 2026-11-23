import {
  ExecutionContext, Injectable, Logger, UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DataSource } from 'typeorm';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly dataSource: DataSource,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      return (await super.canActivate(context)) as boolean;
    } catch (error) {
      if (!(error instanceof UnauthorizedException)) {
        throw error;
      }

      const request = context.switchToHttp().getRequest();
      const authorization = request.headers.authorization as string | undefined;
      if (!authorization?.startsWith('Bearer ')) {
        throw error;
      }

      let verifiedUser: Awaited<ReturnType<SupabaseService['verifyToken']>>;
      try {
        verifiedUser = await this.supabase.verifyToken(authorization.slice(7));
      } catch (supabaseError) {
        this.logger.warn(
          `Supabase access token rejected: ${
            supabaseError instanceof Error ? supabaseError.message : 'unknown verification error'
          }`,
        );
        throw error;
      }

      await this.dataSource.query(
        `INSERT INTO users (id, email, password_hash, full_name, role, is_active)
         VALUES ($1::uuid, $2, NULL, $3, $4::user_role, TRUE)
         ON CONFLICT (id) DO UPDATE
         SET email = EXCLUDED.email,
             full_name = EXCLUDED.full_name,
             role = EXCLUDED.role,
             is_active = TRUE`,
        [verifiedUser.id, verifiedUser.email, verifiedUser.fullName, verifiedUser.role],
      );
      request.user = verifiedUser;
      return true;
    }
  }
}
