import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { getAssetProfileIdentifier } from '@ghostfolio/common/helper';
import { AssetProfileIdentifier, Filter } from '@ghostfolio/common/interfaces';

import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import ms from 'ms';

@Injectable()
export class RedisCacheService {
  public constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly configurationService: ConfigurationService
  ) {
    const client = cache.stores[0];

    client.on('error', (error) => {
      Logger.error(error, 'RedisCacheService');
    });
  }

  public async get(key: string): Promise<string> {
    return this.cache.get(key);
  }

  public async getKeys(aPrefix?: string): Promise<string[]> {
    const keys: string[] = [];
    const prefix = aPrefix;

    this.cache.stores[0].deserialize = (value) => {
      try {

        return JSON.parse(value);
      } catch (error: any) {
        if (error instanceof SyntaxError) {
          Logger.warn(
            `Failed to parse json, so returning the value as String :${value}`,
            'RedisCacheService'
          );

          return value;
        } else {

          throw error;
        }
      };
    }

    for await (const [key] of this.cache.stores[0].iterator({})) {
      if ((prefix && key.startsWith(prefix)) || !prefix) {
        keys.push(key);
      }
    }

    return keys;
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
      const isHealthy = await Promise.race([
        this.getKeys(),
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
    return this.cache.mdel(keys);
  }

  public async reset() {
    return this.cache.clear();
  }

  public async set(key: string, value: string, ttl?: number) {
    return this.cache.set(
      key,
      value,
      ttl ?? this.configurationService.get('CACHE_TTL')
    );
  }
}
