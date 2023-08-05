import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { getAssetProfileIdentifier } from '@ghostfolio/common/helper';
import { UniqueAsset } from '@ghostfolio/common/interfaces';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';

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
    return await this.cache.get(key);
  }

  public getQuoteKey({ dataSource, symbol }: UniqueAsset) {
    return `quote-${getAssetProfileIdentifier({ dataSource, symbol })}`;
  }

  public async remove(key: string) {
    await this.cache.del(key);
  }

  public async reset() {
    await this.cache.reset();
  }

  public async set(key: string, value: string, ttlInSeconds?: number) {
    await this.cache.set(
      key,
      value,
      ttlInSeconds ?? this.configurationService.get('CACHE_TTL')
    );
  }
}
