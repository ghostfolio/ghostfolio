import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';

import { ConfigurationService } from '../../services/configuration.service';

@Injectable()
export class RedisCacheService {
  public constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly configurationService: ConfigurationService
  ) {}

  public async get(key: string): Promise<string> {
    return await this.cache.get(key);
  }

  public async remove(key: string) {
    await this.cache.del(key);
  }

  public async reset() {
    await this.cache.reset();
  }

  public async set(key: string, value: string) {
    await this.cache.set(key, value, {
      ttl: this.configurationService.get('CACHE_TTL')
    });
  }
}
