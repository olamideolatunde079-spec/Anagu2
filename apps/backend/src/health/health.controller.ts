import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { RedisService } from '../common/redis/redis.service';
import { MqttService } from '../mqtt/mqtt.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly redis: RedisService,
    private readonly mqtt: MqttService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Liveness probe' })
  liveness() {
    return {
      status: 'ok',
      service: 'anagu-backend',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe checking PostgreSQL, PostGIS, Redis, and EMQX MQTT' })
  async readiness() {
    let postgresOk = false;
    let postgisVersion: string | null = null;

    try {
      const rows = await this.dataSource.query<Array<{ version: string }>>(
        'SELECT PostGIS_Version() AS version',
      );
      postgresOk = true;
      postgisVersion = rows[0]?.version ?? null;
    } catch {
      postgresOk = false;
    }

    const redisHealth = await this.redis.ping();
    const mqttConnected = this.mqtt.isConnected();

    return {
      status: postgresOk ? 'ready' : 'degraded',
      timestamp: new Date().toISOString(),
      dependencies: {
        postgres: { connected: postgresOk },
        postgis: { enabled: Boolean(postgisVersion), version: postgisVersion },
        redis: { connected: redisHealth.ok, mode: redisHealth.mode },
        mqtt: { connected: mqttConnected },
      },
    };
  }
}
