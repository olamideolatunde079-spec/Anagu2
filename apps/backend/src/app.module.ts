import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GisModule } from './gis/gis.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { OracleModule } from './oracle/oracle.module';
import { MqttModule } from './mqtt/mqtt.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ParcelsModule } from './parcels/parcels.module';
import { DocumentsModule } from './documents/documents.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditModule } from './audit/audit.module';
import { AdminModule } from './admin/admin.module';
import { EvaluationModule } from './evaluation/evaluation.module';
import { SupabaseModule } from './supabase/supabase.module';
import { RedisModule } from './common/redis/redis.module';
import { HealthModule } from './health/health.module';
import { RateLimitGuard } from './common/guards/rate-limit.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProd = config.get<string>('NODE_ENV') === 'production';
        const databaseUrl = config.get<string>('DATABASE_URL');
        const password =
          config.get<string>('DATABASE_APP_PASSWORD') ??
          config.get<string>('POSTGRES_PASSWORD', '');

        if (isProd && !databaseUrl && !password) {
          throw new Error('DATABASE_URL or database password must be configured in production.');
        }

        return {
          type: 'postgres' as const,
          ...(databaseUrl
            ? { url: databaseUrl }
            : {
                host: config.get<string>('POSTGRES_HOST', 'localhost'),
                port: config.get<number>('POSTGRES_PORT', 5432),
                database: config.get<string>('POSTGRES_DB', 'anagu'),
                username:
                  config.get<string>('DATABASE_APP_USER') ??
                  config.get<string>('POSTGRES_USER', 'anagu_admin'),
                password,
              }),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          // PostGIS geometry & SQL triggers are managed via versioned SQL migrations.
          synchronize: false,
          logging: config.get<string>('NODE_ENV') === 'development',
          ssl: isProd ? { rejectUnauthorized: false } : false,
        };
      },
    }),

    RedisModule,
    HealthModule,
    SupabaseModule,

    AuthModule,
    UsersModule,
    GisModule,
    BlockchainModule,
    OracleModule,
    MqttModule,
    ParcelsModule,
    DocumentsModule,
    MarketplaceModule,
    NotificationsModule,
    AuditModule,
    AdminModule,
    EvaluationModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
})
export class AppModule {}
