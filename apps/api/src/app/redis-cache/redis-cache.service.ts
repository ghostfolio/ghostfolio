import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { getAssetProfileIdentifier } from '@ghostfolio/common/helper';
import { AssetProfileIdentifier, Filter } from '@ghostfolio/common/interfaces';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import ms from 'ms';
import { createHash, randomUUID } from 'node:crypto';

@Injectable()
export class RedisCacheService {
  private readonly logger = new Logger(RedisCacheService.name);

  private client: Cache['stores'][0];

  public constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly configurationService: ConfigurationService
  ) {
    this.client = cache.stores[0];

    this.client.deserialize = (value) => {
      try {
        return JSON.parse(value);
      } catch {}

      return value;
    };

    this.client.on('error', (error) => {
      this.logger.error(error);
    });
  }

  public async get(key: string): Promise<string> {
    return this.cache.get(key);
  }

  public async getKeys(aPrefix?: string): Promise<string[]> {
    const keys: string[] = [];
    const prefix = aPrefix;

    try {
      for await (const [key] of this.client.iterator({})) {
        if ((prefix && key.startsWith(prefix)) || !prefix) {
          keys.push(key);
        }
      }
    } catch {}

    return keys;
  }

  public getPortfolioSnapshotKey({
    calculationType,
    filters,
    userId
  }: {
    calculationType: PerformanceCalculationType;
    filters?: Filter[];
    userId: string;
  }) {
    let portfolioSnapshotKey = `${this.getPortfolioSnapshotKeyPrefix({ userId })}-${calculationType}`;

    if (filters?.length > 0) {
      const filtersHash = createHash('sha256')
        .update(JSON.stringify(filters))
        .digest('hex');

      portfolioSnapshotKey = `${portfolioSnapshotKey}-${filtersHash}`;
    }

    return portfolioSnapshotKey;
  }

  public getQuoteKey({ dataSource, symbol }: AssetProfileIdentifier) {
    return `quote-${getAssetProfileIdentifier({ dataSource, symbol })}`;
  }

  public async isHealthy() {
    const HEALTH_CHECK_TIMEOUT = ms('5 seconds');

    const testKey = `__health_check__${randomUUID().replace(/-/g, '')}`;
    const testValue = Date.now().toString();

    try {
      await Promise.race([
        (async () => {
          await this.set(testKey, testValue, HEALTH_CHECK_TIMEOUT);

          const result = await this.get(testKey);

          if (result !== testValue) {
            throw new Error('Redis health check failed: value mismatch');
          }
        })(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Redis health check failed: timeout')),
            HEALTH_CHECK_TIMEOUT
          )
        )
      ]);

      return true;
    } catch (error) {
      this.logger.error(error?.message);

      return false;
    } finally {
      try {
        await this.remove(testKey);
      } catch {}
    }
  }

  public async remove(key: string) {
    return this.cache.del(key);
  }

  public async removePortfolioSnapshotsByUserId({
    userId
  }: {
    userId: string;
  }) {
    const keys = await this.getKeys(
      this.getPortfolioSnapshotKeyPrefix({ userId })
    );

    return this.cache.mdel(keys);
  }

  public async reset() {
    return this.cache.clear();
  }

  public async set(
    key: string,
    value: string,
    optionsOrTtl?: number | { ttl?: number; tags?: string[] }
  ) {
    const ttl =
      typeof optionsOrTtl === 'number'
        ? optionsOrTtl
        : optionsOrTtl?.ttl ?? this.configurationService.get('CACHE_TTL');

    const tags =
      typeof optionsOrTtl === 'object' ? optionsOrTtl.tags ?? [] : [];

    const result = await this.cache.set(key, value, ttl);

    if (tags.length > 0) {
      const redisClient = this.getRedisClient();

      if (redisClient && typeof redisClient.sadd === 'function') {
        for (const tag of tags) {
          await redisClient.sadd(`tag:${tag}`, key);
        }
      }
    }

    return result;
  }

  public async invalidateByTag(tag: string) {
    const redisClient = this.getRedisClient();

    if (redisClient && typeof redisClient.smembers === 'function') {
      const keys = (await redisClient.smembers(`tag:${tag}`)) as string[];

      if (keys?.length > 0) {
        await this.cache.mdel(keys);
      }

      await redisClient.del(`tag:${tag}`);
    }
  }

  private getRedisClient() {
    return (
      (this.client as any).opts?.store?.redis ||
      (this.client as any).opts?.store?.client ||
      (this.client as any).client ||
      (this.client as any).redis
    );
  }

  private getPortfolioSnapshotKeyPrefix({ userId }: { userId: string }) {
    return `portfolio-snapshot-${userId}`;
  }
}
