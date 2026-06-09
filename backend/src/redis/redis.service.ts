/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const tls = this.config.get<string>('REDIS_TLS') === 'true';
    this.client = new Redis({
      host: this.config.get<string>('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
      password: this.config.get<string>('REDIS_PASSWORD') || undefined,
      lazyConnect: true,
      ...(tls && { tls: {} }),
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  // ── Token blacklist ──────────────────────────────────────────────────────

  /** Blacklist a refresh token until its TTL expires (seconds). */
  async blacklistToken(jti: string, ttlSeconds: number): Promise<void> {
    await this.client.set(`blacklist:${jti}`, '1', 'EX', ttlSeconds);
  }

  async isTokenBlacklisted(jti: string): Promise<boolean> {
    const result = await this.client.get(`blacklist:${jti}`);
    return result !== null;
  }

  // ── Refresh token store (per user) ──────────────────────────────────────

  /** Persist a hashed refresh token keyed by userId. TTL in seconds. */
  async setRefreshToken(userId: string, hashedToken: string, ttlSeconds: number): Promise<void> {
    await this.client.set(`refresh:${userId}`, hashedToken, 'EX', ttlSeconds);
  }

  async getRefreshToken(userId: string): Promise<string | null> {
    return this.client.get(`refresh:${userId}`);
  }

  async deleteRefreshToken(userId: string): Promise<void> {
    await this.client.del(`refresh:${userId}`);
  }

  // ── Generic cache ─────────────────────────────────────────────────────────

  async getCache<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(`cache:${key}`);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async setCache(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.client.set(`cache:${key}`, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // Cache failures are transparent to callers
    }
  }

  async invalidateCache(...keys: string[]): Promise<void> {
    if (!keys.length) return;
    try {
      await this.client.del(keys.map((k) => `cache:${k}`));
    } catch {
      // Cache failures are transparent to callers
    }
  }

  // ── Health ────────────────────────────────────────────────────────────────

  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  // ── Password reset tokens ─────────────────────────────────────────────────

  /** Store a password reset token → userId mapping for 15 minutes. */
  async setPasswordResetToken(token: string, userId: string): Promise<void> {
    await this.client.set(`pwd-reset:${token}`, userId, 'EX', 15 * 60);
  }

  async getPasswordResetToken(token: string): Promise<string | null> {
    return this.client.get(`pwd-reset:${token}`);
  }

  async deletePasswordResetToken(token: string): Promise<void> {
    await this.client.del(`pwd-reset:${token}`);
  }
}
