import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';

import { Injectable, Logger } from '@nestjs/common';

const CONNECTION_KEY_PREFIX = 'agent:connections:';
const CONNECTION_TTL_MS = 120_000;

@Injectable()
export class AgentConnectionTracker {
  private readonly logger = new Logger(AgentConnectionTracker.name);
  private readonly maxConnections: number;

  // In-memory fallback when Redis is unavailable
  private readonly fallbackConnections = new Map<string, number>();
  private useRedis = true;

  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly redisCacheService: RedisCacheService
  ) {
    this.maxConnections = this.configurationService.get(
      'AGENT_MAX_CONCURRENT_CONNECTIONS'
    );
  }

  public async acquire(userId: string): Promise<boolean> {
    try {
      if (this.useRedis) {
        const key = `${CONNECTION_KEY_PREFIX}${userId}`;
        const count = await this.redisCacheService.increment(
          key,
          CONNECTION_TTL_MS
        );

        if (count > this.maxConnections) {
          // Over limit — decrement back by setting count - 1
          await this.redisCacheService.set(
            key,
            String(count - 1),
            CONNECTION_TTL_MS
          );
          this.logger.warn('Connection limit reached', { userId, count });
          return false;
        }

        return true;
      }
    } catch (error) {
      this.logger.warn(
        'Redis connection tracker failed, falling back to in-memory',
        error
      );
      this.useRedis = false;
    }

    return this.acquireFallback(userId);
  }

  public release(userId: string): void {
    if (this.useRedis) {
      const key = `${CONNECTION_KEY_PREFIX}${userId}`;
      void this.releaseRedis(key).catch((error) => {
        this.logger.warn('Redis connection release failed', error);
        this.releaseFallback(userId);
      });
    } else {
      this.releaseFallback(userId);
    }
  }

  public async getCount(userId: string): Promise<number> {
    try {
      if (this.useRedis) {
        const key = `${CONNECTION_KEY_PREFIX}${userId}`;
        const val = await this.redisCacheService.get(key);
        return val ? parseInt(val, 10) : 0;
      }
    } catch {
      // Fall through to in-memory
    }

    return this.fallbackConnections.get(userId) ?? 0;
  }

  private async releaseRedis(key: string): Promise<void> {
    const raw = await this.redisCacheService.get(key);
    const current = raw ? parseInt(raw, 10) : 0;

    if (current > 1) {
      await this.redisCacheService.set(
        key,
        String(current - 1),
        CONNECTION_TTL_MS
      );
    } else {
      await this.redisCacheService.remove(key);
    }
  }

  private acquireFallback(userId: string): boolean {
    const current = this.fallbackConnections.get(userId) ?? 0;

    if (current >= this.maxConnections) {
      this.logger.warn('Connection limit reached (fallback)', {
        userId,
        current
      });
      return false;
    }

    this.fallbackConnections.set(userId, current + 1);
    return true;
  }

  private releaseFallback(userId: string): void {
    const current = this.fallbackConnections.get(userId) ?? 0;

    if (current > 1) {
      this.fallbackConnections.set(userId, current - 1);
    } else {
      this.fallbackConnections.delete(userId);
    }
  }
}
