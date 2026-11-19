import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3001);

  // ── Security Headers Middleware ───────────────────────────────────────
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-XSS-Protection', '0');
    res.removeHeader('X-Powered-By');
    next();
  });

  // ── Global pipes ───────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Global filters ────────────────────────────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());

  // ── CORS ──────────────────────────────────────────────────────────────
  const configuredOrigins = (config.get<string>('CORS_ORIGINS', '') || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5173',
      'http://localhost:19006',
      ...configuredOrigins,
    ],
    credentials: true,
  });

  // ── API prefix ────────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── Swagger docs ──────────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Anagu Land Administration API')
    .setDescription(
      'Integrated Blockchain–GIS–NFT–Community Verification Oracle–MQTT ' +
      'framework for land title registration, verification, marketplace transfer, and lawful revocation.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('health', 'Service readiness & dependency health checks')
    .addTag('auth', 'Authentication & session lifecycle')
    .addTag('users', 'User profiles, KYC verification, RBAC & institutional staff')
    .addTag('jurisdictions', 'States, LGAs & cadastral jurisdictions')
    .addTag('gis', 'Component 1 — GIS Spatial Verification & PostGIS queries')
    .addTag('applications', 'Land registration applications & statutory workflow')
    .addTag('parcels', 'Cadastral land parcels & ownership records')
    .addTag('documents', 'Private MinIO document management, verification & grants')
    .addTag('oracle', 'Component 3A — Ownership Verification Oracle & attestations')
    .addTag('titles', 'Component 2 — NFT Land Titles (Polygon Amoy)')
    .addTag('public verification', 'Public registry exploration & certificate verification')
    .addTag('marketplace', 'Verified land marketplace, escrow, commissions & settlements')
    .addTag('notifications', 'In-app & MQTT user notifications')
    .addTag('audit', 'Immutable hash-chained audit trail')
    .addTag('admin', 'Administrative configuration & platform overview')
    .addTag('evaluation', 'Component 4 — Cross-cutting evaluation')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  logger.log(`Anagu backend running on: http://localhost:${port}`);
  logger.log(`Swagger docs:             http://localhost:${port}/api/docs`);
}

bootstrap();
