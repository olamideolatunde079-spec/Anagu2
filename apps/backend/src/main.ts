import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3001);

  // ── Global pipes ───────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // strip unknown props
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Global filters ────────────────────────────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());

  // ── CORS ──────────────────────────────────────────────────────────────
  // ── CORS ──────────────────────────────────────────────────────────────
  const frontendUrl = config.get<string>('FRONTEND_URL');

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:19006',
      frontendUrl,
    ].filter((origin): origin is string => Boolean(origin)),
    credentials: true,
  });

  // ── API prefix ────────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── Swagger docs ──────────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Anagu Land Administration API')
    .setDescription(
      'Integrated Blockchain–GIS–NFT–Community Verification Oracle–MQTT ' +
      'framework for land title registration, verification, and lawful revocation.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication')
    .addTag('gis', 'Component 1 — GIS Spatial Verification')
    .addTag('applications', 'Land registration applications')
    .addTag('parcels', 'Land parcels')
    .addTag('titles', 'Component 2 — NFT Land Titles')
    .addTag('oracle', 'Component 3A — Ownership Verification Oracle')
    .addTag('documents', 'Land document management')
    .addTag('audit', 'Immutable audit trail')
    .addTag('evaluation', 'Component 4 — Cross-cutting evaluation')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  logger.log(`🚀 Anagu backend running on: http://localhost:${port}`);
  logger.log(`📖 Swagger docs:              http://localhost:${port}/api/docs`);
}

bootstrap();
