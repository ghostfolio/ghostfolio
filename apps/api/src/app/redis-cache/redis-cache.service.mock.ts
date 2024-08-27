import { RedisCacheService } from './redis-cache.service';

export const RedisCacheServiceMock = {
  get: (key: string): Promise<string> => {
    return Promise.resolve(null);
  },
  getPortfolioSnapshotKey: (userId: string): string => {
    return `portfolio-snapshot-${userId}`;
  },
  set: (key: string, value: string, ttlInSeconds?: number): Promise<string> => {
    return Promise.resolve(value);
  }
};
