import * as crypto from 'crypto';
import type { ConfigService } from '@nestjs/config';

const EPHEMERAL_DEV_SECRET = crypto.randomBytes(48).toString('hex');

export function resolveJwtSecret(config: ConfigService): string {
  const configured = config.get<string>('JWT_SECRET');
  const nodeEnv = config.get<string>('NODE_ENV', 'development');

  if (configured && configured.trim().length >= 32 && !configured.startsWith('CHANGE_ME')) {
    return configured;
  }

  if (nodeEnv === 'production') {
    throw new Error('JWT_SECRET must be set to a strong >=32-character secret in production.');
  }

  return configured && configured.trim().length > 0 && !configured.startsWith('CHANGE_ME')
    ? configured
    : EPHEMERAL_DEV_SECRET;
}
