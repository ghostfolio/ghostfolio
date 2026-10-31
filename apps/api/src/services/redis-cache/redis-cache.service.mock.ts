import { Filter } from '@ghostfolio/common/interfaces';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

export const RedisCacheServiceMock = {
  cache: new Map<string, string>(),
  get: (key: string): Promise<string | undefined> => {
    const value = RedisCacheServiceMock.cache.get(key);

    return Promise.resolve(value);
  },
  getPortfolioSnapshotKey: ({
    calculationType,
    filters,
    userId
  }: {
    calculationType: PerformanceCalculationType;
    filters?: Filter[];
    userId: string;
  }): string => {
    const filtersHash = filters?.length;

    return `portfolio-snapshot-${userId}-${calculationType}${filtersHash && filtersHash > 0 ? `-${filtersHash}` : ''}`;
  },
  reset: () => {
    RedisCacheServiceMock.cache.clear();
  },
  set: (key: string, value: string): Promise<string> => {
    RedisCacheServiceMock.cache.set(key, value);

    return Promise.resolve(value);
  }
};
