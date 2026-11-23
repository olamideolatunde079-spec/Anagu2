import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * SupabaseService — server-side admin client.
 *
 * Project URL : https://wcykxpsbtbsoxxmitslk.supabase.co
 * JWKS URL    : https://wcykxpsbtbsoxxmitslk.supabase.co/auth/v1/.well-known/jwks.json
 *
 * The service secret key is used here — NEVER send it to the browser.
 *
 * Responsibilities:
 *  1. Admin-level DB queries (bypass RLS for background jobs)
 *  2. Verify Supabase JWTs issued to web/mobile clients
 *  3. Sync land_titles and applications tables to Supabase for realtime
 */
@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private _admin!: SupabaseClient;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const url       = this.config.get<string>('SUPABASE_URL')!;
    const secretKey = this.config.get<string>('SUPABASE_SECRET_KEY')!;

    if (!url || !secretKey) {
      this.logger.warn(
        'SUPABASE_URL or SUPABASE_SECRET_KEY not set — Supabase integration disabled.',
      );
      return;
    }

    this._admin = createClient(url, secretKey, {
      auth: {
        autoRefreshToken:  false,
        persistSession:    false,
        detectSessionInUrl: false,
      },
    });

    this.logger.log(`Supabase admin client initialised → ${url}`);
  }

  /** The service-role admin client. Use only server-side. */
  get admin(): SupabaseClient {
    if (!this._admin) {
      throw new Error('Supabase admin client is not initialised — check SUPABASE_SECRET_KEY');
    }
    return this._admin;
  }

  /**
   * Verify a Supabase JWT issued by the web/mobile client.
   * Returns the user payload if valid; throws on failure.
   *
   * Uses Supabase's built-in getUser() which validates the token
   * server-side against the JWKS endpoint:
   *   https://wcykxpsbtbsoxxmitslk.supabase.co/auth/v1/.well-known/jwks.json
   */
  async verifyToken(token: string): Promise<{
    id: string;
    email: string;
    role: string;
    fullName: string;
  }> {
    const { data, error } = await this.admin.auth.getUser(token);
    if (error || !data.user) {
      throw new Error(`Supabase JWT verification failed: ${error?.message}`);
    }
    const role = String(data.user.app_metadata?.role ?? 'CITIZEN').toUpperCase();
    const allowedRoles = ['CITIZEN', 'SURVEYOR', 'REGISTRAR', 'LAND_ADMINISTRATOR', 'GOVERNOR'];
    return {
      id:    data.user.id,
      email: data.user.email ?? '',
      role:  allowedRoles.includes(role) ? role : 'CITIZEN',
      fullName: String(data.user.user_metadata?.full_name ?? data.user.email?.split('@')[0] ?? 'User'),
    };
  }

  /**
   * Upsert a land title record into Supabase so realtime clients
   * (web dashboard, mobile) receive instant updates.
   */
  async syncLandTitle(title: {
    tokenId:      string;
    parcelId:     string;
    ownerAddress: string;
    txHash:       string;
    isRevoked:    boolean;
    issuedAt:     Date;
  }) {
    const { error } = await this.admin
      .from('land_titles')
      .upsert({
        token_id:      title.tokenId,
        parcel_id:     title.parcelId,
        owner_address: title.ownerAddress,
        tx_hash:       title.txHash,
        is_revoked:    title.isRevoked,
        issued_at:     title.issuedAt.toISOString(),
      }, { onConflict: 'token_id' });

    if (error) this.logger.error('Supabase syncLandTitle failed', error.message);
  }

  /**
   * Upsert an application status change into Supabase for realtime
   * citizen-facing status updates.
   */
  async syncApplicationStatus(applicationId: string, status: string, updatedAt: Date) {
    const { error } = await this.admin
      .from('applications')
      .update({ status, updated_at: updatedAt.toISOString() })
      .eq('id', applicationId);

    if (error) this.logger.error('Supabase syncApplicationStatus failed', error.message);
  }

  /**
   * Write a record to the Supabase audit_events table.
   * This mirrors the local audit trail to Supabase for external access.
   */
  async syncAuditEvent(event: {
    entityType: string;
    entityId:   string;
    eventType:  string;
    actorRole:  string;
    actorId:    string;
    metadata?:  Record<string, unknown>;
  }) {
    const { error } = await this.admin.from('audit_events').insert({
      entity_type: event.entityType,
      entity_id:   event.entityId,
      event_type:  event.eventType,
      actor_role:  event.actorRole,
      actor_id:    event.actorId,
      metadata:    event.metadata ?? {},
      created_at:  new Date().toISOString(),
    });

    if (error) this.logger.error('Supabase syncAuditEvent failed', error.message);
  }
}
