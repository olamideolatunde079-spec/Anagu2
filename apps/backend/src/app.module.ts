import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GisModule } from './gis/gis.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { OracleModule } from './oracle/oracle.module';
import { MqttModule } from './mqtt/mqtt.module';
import { AuthModule } from './auth/auth.module';
import { ParcelsModule } from './parcels/parcels.module';
import { DocumentsModule } from './documents/documents.module';
import { ParcelPhotosModule } from './parcel-photos/parcel-photos.module';
import { AuditModule } from './audit/audit.module';
import { EvaluationModule } from './evaluation/evaluation.module';
import { SupabaseModule } from './supabase/supabase.module';

@Module({
  imports: [
    // ── Config (loads .env from monorepo root and local .env) ──────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),

    // ── Database: PostgreSQL + PostGIS (primary data store) ─────────────
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host:     config.get('POSTGRES_HOST', 'localhost'),
        port:     config.get<number>('POSTGRES_PORT', 5432),
        database: config.get('POSTGRES_DB', 'anagu'),
        username: config.get('POSTGRES_USER', 'anagu'),
        password: config.get('POSTGRES_PASSWORD', 'anagu_secret'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        // The schema includes PostGIS geometry/indexes; never let TypeORM synchronize it.
        synchronize: false,
        logging: config.get('NODE_ENV') === 'development',
        ssl: config.get('NODE_ENV') === 'production'
          ? { rejectUnauthorized: false }
          : false,
      }),
    }),

    // ── Supabase (auth JWT verification + realtime sync) ─────────────────
    // Project: https://wcykxpsbtbsoxxmitslk.supabase.co
    // JWKS:    https://wcykxpsbtbsoxxmitslk.supabase.co/auth/v1/.well-known/jwks.json
    SupabaseModule,

    // ── Feature modules ──────────────────────────────────────────────────
    AuthModule,       // JWT auth + RBAC (5 roles)
    GisModule,        // Component 1 — spatial verification
    BlockchainModule, // Component 2 — NFT issuance + revocation
    OracleModule,     // Component 3A — ownership verification
    MqttModule,       // Component 3B — real-time messaging
    ParcelsModule,    // Registration workflow orchestrator
    DocumentsModule,  // MinIO document storage
    ParcelPhotosModule,
    AuditModule,      // Immutable audit trail
    EvaluationModule, // Component 4 — cross-cutting evaluation
  ],
})
export class AppModule {}
