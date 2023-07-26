import { Store } from 'cache-manager';
import { RedisClient } from 'redis';

export interface RedisStore extends Store {
  getClient: () => RedisClient;
  isCacheableValue: (value: any) => boolean;
  name: 'redis';
}
