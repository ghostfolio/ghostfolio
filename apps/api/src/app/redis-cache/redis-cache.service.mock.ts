import { Milliseconds } from 'cache-manager';

export const RedisCacheServiceMock = {
  get: (key: string): Promise<string> => {
    return Promise.resolve(null);
  },
  getPortfolioSnapshotKey: (userId: string): string => {
    return `portfolio-snapshot-${userId}`;
  },
  set: (key: string, value: string, ttl?: Milliseconds): Promise<string> => {
    return Promise.resolve(value);
  }
};
