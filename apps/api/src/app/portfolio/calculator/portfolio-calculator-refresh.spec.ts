import { PortfolioCalculatorFactory } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator.factory';
import { PORTFOLIO_SNAPSHOT_COMPUTATION_QUEUE_PRIORITY_LOW } from '@ghostfolio/common/config';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

import { Logger } from '@nestjs/common';

jest.mock('@ghostfolio/api/app/portfolio/current-rate.service', () => ({
  CurrentRateService: jest.fn()
}));
jest.mock(
  '@ghostfolio/api/services/configuration/configuration.service',
  () => ({
    ConfigurationService: jest.fn()
  })
);
jest.mock(
  '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service',
  () => ({
    ExchangeRateDataService: jest.fn()
  })
);
jest.mock(
  '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service',
  () => ({
    PortfolioSnapshotService: jest.fn()
  })
);
jest.mock('@ghostfolio/api/services/redis-cache/redis-cache.service', () => ({
  RedisCacheService: jest.fn()
}));

describe('Portfolio snapshot background refresh', () => {
  const snapshot = { historicalData: [], positions: [] };
  let factory: PortfolioCalculatorFactory;
  let queue: { addJobToQueue: jest.Mock; getJob: jest.Mock };
  let quotes: { getValues: jest.Mock };
  let fx: { getExchangeRatesByCurrency: jest.Mock };
  let redis: { get: jest.Mock; getPortfolioSnapshotKey: jest.Mock };
  let errorLog: jest.SpyInstance;

  const create = (calculationType = PerformanceCalculationType.ROI) =>
    factory.createCalculator({
      accountBalanceItems: [],
      activities: [],
      calculationType,
      currency: 'EUR',
      filters: [],
      userId: 'refresh-test'
    });

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00Z'));
    errorLog = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
    queue = {
      addJobToQueue: jest.fn().mockResolvedValue(undefined),
      getJob: jest.fn()
    };
    quotes = { getValues: jest.fn() };
    fx = { getExchangeRatesByCurrency: jest.fn() };
    redis = {
      get: jest.fn().mockResolvedValue(
        JSON.stringify({
          expiration: Date.now() - 1,
          portfolioSnapshot: snapshot
        })
      ),
      getPortfolioSnapshotKey: jest.fn().mockReturnValue('refresh-test-key')
    };
    factory = new PortfolioCalculatorFactory(
      { get: () => 365 } as never,
      quotes as never,
      fx as never,
      queue as never,
      redis as never
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it.each(Object.values(PerformanceCalculationType))(
    '%s serves the stale snapshot and handles an enqueue rejection',
    async (method) => {
      const failure = new Error('Queue unavailable');
      queue.addJobToQueue.mockRejectedValue(failure);
      expect(
        JSON.parse(JSON.stringify(await create(method).getSnapshot()))
      ).toEqual(snapshot);
      await Promise.resolve();
      expect(errorLog).toHaveBeenCalledWith(
        'Failed to enqueue portfolio snapshot refresh',
        failure
      );
      expect(queue.addJobToQueue).toHaveBeenCalledTimes(1);
      expect(queue.addJobToQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          opts: expect.objectContaining({
            jobId: 'refresh-test-key',
            priority: PORTFOLIO_SNAPSHOT_COMPUTATION_QUEUE_PRIORITY_LOW
          })
        })
      );
      expect(queue.getJob).not.toHaveBeenCalled();
      expect(quotes.getValues).not.toHaveBeenCalled();
      expect(fx.getExchangeRatesByCurrency).not.toHaveBeenCalled();
    }
  );

  it('returns before the queue settles and handles a later rejection', async () => {
    let reject: (error: Error) => void;
    const pending = new Promise<void>((_resolve, rejectPromise) => {
      reject = rejectPromise;
    });
    queue.addJobToQueue.mockReturnValue(pending);
    expect(JSON.parse(JSON.stringify(await create().getSnapshot()))).toEqual(
      snapshot
    );
    expect(errorLog).not.toHaveBeenCalled();
    reject(new Error('Delayed queue failure'));
    await Promise.resolve();
    expect(errorLog).toHaveBeenCalledWith(
      'Failed to enqueue portfolio snapshot refresh',
      expect.objectContaining({ message: 'Delayed queue failure' })
    );
    expect(queue.addJobToQueue).toHaveBeenCalledTimes(1);
  });

  it.each(['Queue unavailable', undefined])(
    'handles a non-Error rejection (%s)',
    async (reason) => {
      queue.addJobToQueue.mockRejectedValue(reason);
      await create().getSnapshot();
      await Promise.resolve();
      expect(errorLog).toHaveBeenCalledWith(
        'Failed to enqueue portfolio snapshot refresh',
        reason
      );
    }
  );

  it('does not wait for a successful background enqueue', async () => {
    let resolve: () => void;
    const pending = new Promise<void>((resolvePromise) => {
      resolve = resolvePromise;
    });
    queue.addJobToQueue.mockReturnValue(pending);
    expect(JSON.parse(JSON.stringify(await create().getSnapshot()))).toEqual(
      snapshot
    );
    resolve();
    await Promise.resolve();
    expect(errorLog).not.toHaveBeenCalled();
    expect(queue.addJobToQueue).toHaveBeenCalledTimes(1);
    expect(queue.getJob).not.toHaveBeenCalled();
  });

  it('does not enqueue a fresh snapshot', async () => {
    redis.get.mockResolvedValue(
      JSON.stringify({
        expiration: Date.now() + 60000,
        portfolioSnapshot: snapshot
      })
    );
    expect(JSON.parse(JSON.stringify(await create().getSnapshot()))).toEqual(
      snapshot
    );
    expect(queue.addJobToQueue).not.toHaveBeenCalled();
    expect(errorLog).not.toHaveBeenCalled();
  });

  it('continues to propagate enqueue failures on a cache miss', async () => {
    redis.get.mockResolvedValue(undefined);
    const failure = new Error('Queue unavailable on miss');
    queue.addJobToQueue.mockRejectedValue(failure);
    await expect(create().getSnapshot()).rejects.toBe(failure);
    expect(queue.addJobToQueue).toHaveBeenCalledTimes(1);
    expect(queue.getJob).not.toHaveBeenCalled();
    expect(errorLog).not.toHaveBeenCalled();
  });
});
