import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private connected = false;
  private readonly memoryFallback = new Map<string, { value: string; expiresAt: number }>();

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const redisUrl = this.config.get<string>('REDIS_URL');
    const host = this.config.get<string>('REDIS_HOST', 'localhost');
    const port = Number(this.config.get<string>('REDIS_PORT', '6379'));
    const password = this.config.get<string>('REDIS_PASSWORD');

    const options = {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: (times: number) => Math.min(times * 500, 5000),
    };

    this.client = redisUrl
      ? new Redis(redisUrl, options)
      : new Redis({ host, port, password: password || undefined, ...options });

    this.client.on('connect', () => {
      this.connected = true;
      this.logger.log(`Redis connected (${host}:${port})`);
    });
    this.client.on('error', (err) => {
      this.connected = false;
      this.logger.warn(`Redis unavailable (using safe local fallback): ${err.message}`);
    });
    this.client.on('close', () => {
      this.connected = false;
    });

    this.client.connect().catch(() => {
      this.connected = false;
    });
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => undefined);
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async ping(): Promise<{ ok: boolean; mode: 'redis' | 'fallback' }> {
    if (this.client && this.connected) {
      try {
        const res = await this.client.ping();
        return { ok: res === 'PONG', mode: 'redis' };
      } catch {
        this.connected = false;
      }
    }
    return { ok: false, mode: 'fallback' };
  }

  async get(key: string): Promise<string | null> {
    if (this.client && this.connected) {
      try {
        return await this.client.get(key);
      } catch {
        this.connected = false;
      }
    }
    const entry = this.memoryFallback.get(key);
    if (!entry) return null;
    if (entry.expiresAt > 0 && Date.now() > entry.expiresAt) {
      this.memoryFallback.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.client && this.connected) {
      try {
        if (ttlSeconds && ttlSeconds > 0) {
          await this.client.set(key, value, 'EX', ttlSeconds);
        } else {
          await this.client.set(key, value);
        }
        return;
      } catch {
        this.connected = false;
      }
    }
    this.memoryFallback.set(key, {
      value,
      expiresAt: ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : 0,
    });
  }

  async del(key: string): Promise<void> {
    if (this.client && this.connected) {
      try {
        await this.client.del(key);
        return;
      } catch {
        this.connected = false;
      }
    }
    this.memoryFallback.delete(key);
  }

  async incrementRateLimit(key: string, windowSeconds: number): Promise<number> {
    if (this.client && this.connected) {
      try {
        const count = await this.client.incr(key);
        if (count === 1) {
          await this.client.expire(key, windowSeconds);
        }
        return count;
      } catch {
        this.connected = false;
      }
    }
    const now = Date.now();
    const existing = this.memoryFallback.get(key);
    if (!existing || now > existing.expiresAt) {
      this.memoryFallback.set(key, {
        value: '1',
        expiresAt: now + windowSeconds * 1000,
      });
      return 1;
    }
    const next = Number(existing.value) + 1;
    existing.value = String(next);
    return next;
  }
}
