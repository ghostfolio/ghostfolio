import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class RedisCacheService {
  public constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

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
    await this.cache.set(key, value, { ttl: Number(process.env.CACHE_TTL) });
  }
}
