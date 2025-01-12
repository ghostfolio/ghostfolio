import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { getAssetProfileIdentifier } from '@ghostfolio/common/helper';
import { AssetProfileIdentifier, Filter } from '@ghostfolio/common/interfaces';

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Milliseconds } from 'cache-manager';
import { RedisCache } from 'cache-manager-redis-yet';
import { createHash } from 'crypto';
import ms from 'ms';

@Injectable()
export class RedisCacheService {
  public constructor(
    @Inject(CACHE_MANAGER) private readonly cache: RedisCache,
    private readonly configurationService: ConfigurationService
  ) {
    const client = cache.store.client;

    client.on('error', (error) => {
      Logger.error(error, 'RedisCacheService');
    });
  }

  public async get(key: string): Promise<string> {
    return this.cache.get(key);
  }

  public async getKeys(aPrefix?: string): Promise<string[]> {
    let prefix = aPrefix;

    if (prefix) {
      prefix = `${prefix}*`;
    }

    return this.cache.store.keys(prefix);
  }

  public getPortfolioSnapshotKey({
    filters,
    userId
  }: {
    filters?: Filter[];
    userId: string;
  }) {
    let portfolioSnapshotKey = `portfolio-snapshot-${userId}`;

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
    try {
      const client = this.cache.store.client;

      const isHealthy = await Promise.race([
        client.ping(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Redis health check timeout')),
            ms('2 seconds')
          )
        )
      ]);

      return isHealthy === 'PONG';
    } catch (error) {
      return false;
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
      `${this.getPortfolioSnapshotKey({ userId })}`
    );

    for (const key of keys) {
      await this.remove(key);
    }
  }

  public async reset() {
    return this.cache.reset();
  }

  public async set(key: string, value: string, ttl?: Milliseconds) {
    return this.cache.set(
      key,
      value,
      ttl ?? this.configurationService.get('CACHE_TTL')
    );
  }
}
