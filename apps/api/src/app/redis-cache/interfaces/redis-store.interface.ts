import { Store } from 'cache-manager';
import { createClient } from 'redis';

export interface RedisStore extends Store {
  getClient: () => ReturnType<typeof createClient>;
  isCacheableValue: (value: any) => boolean;
  name: 'redis';
}
