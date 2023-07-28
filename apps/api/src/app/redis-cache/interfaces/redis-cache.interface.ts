import { Cache } from 'cache-manager';

import type { RedisStore } from './redis-store.interface';

export interface RedisCache extends Cache {
  store: RedisStore;
}
