import { PortfolioCalculatorFactory } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator.factory';
import { RedisCacheService } from '@ghostfolio/api/services/redis-cache/redis-cache.service';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

import { PortfolioSnapshotProcessor } from './portfolio-snapshot.processor';

describe('Cash snapshot cache isolation', () => {
  const userId = 'cash-cache-test';
  let values: Map<string, string>;
  let cache: RedisCacheService;
  beforeEach(() => {
    values = new Map();
    const store = {
      on: jest.fn(),
      async *iterator() {
        yield* values.entries();
      }
    };
    cache = new RedisCacheService(
      {
        stores: [store],
        get: async (key: string) => values.get(key),
        set: async (key: string, value: string) => {
          values.set(key, value);
        },
        del: async (key: string) => values.delete(key),
        mdel: async (keys: string[]) => {
          for (const key of keys) values.delete(key);
        }
      } as never,
      {} as never
    );
  });
  const scope = () => ({
    userId,
    calculationType: PerformanceCalculationType.ROAI,
    filters: []
  });
  it('preserves the official canonical key and isolates all-recorded cash', () => {
    const normal = cache.getPortfolioSnapshotKey(scope());
    expect(
      cache.getPortfolioSnapshotKey({ ...scope(), withHiddenCash: false })
    ).toBe(normal);
    expect(
      cache.getPortfolioSnapshotKey({ ...scope(), withHiddenCash: true })
    ).toBe(normal + '-cash-all');
  });
  it('invalidates both views only for the changed user', async () => {
    const normal = cache.getPortfolioSnapshotKey(scope()),
      all = cache.getPortfolioSnapshotKey({ ...scope(), withHiddenCash: true });
    values.set(normal, 'one');
    values.set(all, 'two');
    values.set(
      cache.getPortfolioSnapshotKey({ ...scope(), userId: 'another-user' }),
      'other'
    );
    await cache.removePortfolioSnapshotsByUserId({ userId });
    expect(values.has(normal)).toBe(false);
    expect(values.has(all)).toBe(false);
    expect(values.size).toBe(1);
  });
  it.each([undefined, true])(
    'passes cash selection to both processor inputs and cache key (%s)',
    async (withHiddenCash) => {
      const balances = {
        getAccountBalanceItems: jest.fn().mockResolvedValue([])
      };
      const activities = {
        getActivitiesForPortfolioCalculator: jest
          .fn()
          .mockResolvedValue({ activities: [] })
      };
      const factory = {
        createCalculator: jest.fn().mockReturnValue({
          computeSnapshot: jest.fn().mockResolvedValue({ positions: [] })
        })
      };
      const processor = new PortfolioSnapshotProcessor(
        balances as never,
        activities as never,
        factory as never,
        { get: () => 10000 } as never,
        cache
      );
      await processor.calculatePortfolioSnapshot({
        data: { ...scope(), userCurrency: 'EUR', withHiddenCash }
      } as never);
      expect(balances.getAccountBalanceItems).toHaveBeenCalledWith(
        expect.objectContaining({ withHiddenCash })
      );
      expect(
        activities.getActivitiesForPortfolioCalculator
      ).toHaveBeenCalledWith(
        expect.objectContaining({ withHiddenCash, withCash: true })
      );
      expect(factory.createCalculator).toHaveBeenCalledWith(
        expect.objectContaining({ withHiddenCash })
      );
      expect(
        values.has(
          cache.getPortfolioSnapshotKey({ ...scope(), withHiddenCash })
        )
      ).toBe(true);
    }
  );
  it('serves repeated real calculator cache hits without quotes or recomputation', async () => {
    for (const [withHiddenCash, netWorth] of [
      [false, 11],
      [true, 22]
    ] as const) {
      values.set(
        cache.getPortfolioSnapshotKey({ ...scope(), withHiddenCash }),
        JSON.stringify({
          expiration: Date.now() + 60000,
          portfolioSnapshot: { historicalData: [{ netWorth }] }
        })
      );
    }
    const quotes = { getValues: jest.fn() },
      queue = { addJobToQueue: jest.fn() };
    const factory = new PortfolioCalculatorFactory(
      { get: jest.fn() } as never,
      quotes as never,
      {} as never,
      queue as never,
      cache
    );
    const started = performance.now();
    for (let i = 0; i < 100; i++) {
      const all = i % 2 === 1;
      const calculator = factory.createCalculator({
        ...scope(),
        activities: [],
        currency: 'EUR',
        withHiddenCash: all
      });
      expect((await calculator.getSnapshot()).historicalData[0].netWorth).toBe(
        all ? 22 : 11
      );
    }
    console.log(
      'Cash cache microbenchmark: 100 in-memory warm reads, ms=' +
        Math.round(performance.now() - started)
    );
    expect(quotes.getValues).not.toHaveBeenCalled();
    expect(queue.addJobToQueue).not.toHaveBeenCalled();
  });
});
