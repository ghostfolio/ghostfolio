import { Filter } from '@ghostfolio/common/interfaces';

import { Milliseconds } from 'cache-manager';

export const RedisCacheServiceMock = {
  cache: new Map<string, string>(),
  get: (key: string): Promise<string> => {
    const value = RedisCacheServiceMock.cache.get(key) || null;

    return Promise.resolve(value);
  },
  getPortfolioSnapshotKey: ({
    filters,
    userId
  }: {
    filters?: Filter[];
    userId: string;
  }): string => {
    const filtersHash = filters?.length;

    return `portfolio-snapshot-${userId}${filtersHash > 0 ? `-${filtersHash}` : ''}`;
  },
  set: (key: string, value: string, ttl?: Milliseconds): Promise<string> => {
    RedisCacheServiceMock.cache.set(key, value);

    return Promise.resolve(value);
  }
};
