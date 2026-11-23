import { Module, Global } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

/**
 * Global Supabase module — exposes the admin client and JWKS helpers
 * to every module in the backend.
 */
@Global()
@Module({
  providers: [SupabaseService],
  exports:   [SupabaseService],
})
export class SupabaseModule {}
