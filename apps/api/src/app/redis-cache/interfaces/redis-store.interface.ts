import { Store } from 'cache-manager';
import Redis from 'redis';

export interface RedisStore extends Store {
  getClient: () => Redis.RedisClient;
  isCacheableValue: (value: any) => boolean;
  name: 'redis';
}
