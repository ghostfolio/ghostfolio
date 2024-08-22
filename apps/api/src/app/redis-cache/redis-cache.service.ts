import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { getAssetProfileIdentifier } from '@ghostfolio/common/helper';
import { AssetProfileIdentifier, Filter } from '@ghostfolio/common/interfaces';

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';

import type { RedisCache } from './interfaces/redis-cache.interface';

@Injectable()
export class RedisCacheService {
  public constructor(
    @Inject(CACHE_MANAGER) private readonly cache: RedisCache,
    private readonly configurationService: ConfigurationService
  ) {
    const client = cache.store.getClient();

    client.on('error', (error) => {
      Logger.error(error, 'RedisCacheService');
    });
  }

  public async get(key: string): Promise<string> {
    return this.cache.get(key);
  }

  public async getKeys(aPrefix?: string): Promise<string[]> {
    return this.cache.store.keys(aPrefix);
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

    console.log(keys);

    for (const key of keys) {
      this.remove(key);
    }
  }

  public async reset() {
    return this.cache.reset();
  }

  public async set(key: string, value: string, ttlInSeconds?: number) {
    return this.cache.set(
      key,
      value,
      ttlInSeconds ?? this.configurationService.get('CACHE_TTL')
    );
  }
}
