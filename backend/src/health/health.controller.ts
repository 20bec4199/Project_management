import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RedisService } from '../redis/redis.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
  ) {}

  @Get()
  async check() {
    const db = this.dataSource.isInitialized;
    const redis = await this.redisService.ping();

    return {
      status: db && redis ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: { db, redis },
    };
  }
}
