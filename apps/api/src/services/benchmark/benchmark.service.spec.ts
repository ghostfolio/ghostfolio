import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import { RedisCacheService } from '@ghostfolio/api/services/redis-cache/redis-cache.service';
import { PROPERTY_BENCHMARKS } from '@ghostfolio/common/config';

import { DataSource } from '@prisma/client';

import { BenchmarkService } from './benchmark.service';

describe('BenchmarkService', () => {
  let benchmarkService: BenchmarkService;
  let findFirst: jest.Mock;
  let getByKey: jest.Mock;
  let put: jest.Mock;
  let remove: jest.Mock;

  beforeEach(() => {
    findFirst = jest.fn();
    getByKey = jest.fn();
    put = jest.fn().mockResolvedValue(undefined);
    remove = jest.fn().mockResolvedValue(true);

    benchmarkService = new BenchmarkService(
      null,
      null,
      { symbolProfile: { findFirst } } as unknown as PrismaService,
      { getByKey, put } as unknown as PropertyService,
      { remove } as unknown as RedisCacheService,
      null
    );
  });

  it('calculateChangeInPercentage', async () => {
    expect(benchmarkService.calculateChangeInPercentage(1, 2)).toEqual(1);
    expect(benchmarkService.calculateChangeInPercentage(2, 2)).toEqual(0);
    expect(benchmarkService.calculateChangeInPercentage(2, 1)).toEqual(-0.5);
  });

  it('getMarketCondition', async () => {
    expect(benchmarkService.getMarketCondition(0)).toEqual('ALL_TIME_HIGH');
    expect(benchmarkService.getMarketCondition(-5.90736454893e-9)).toEqual(
      'ALL_TIME_HIGH'
    );
    expect(benchmarkService.getMarketCondition(-0.1)).toEqual('NEUTRAL_MARKET');
    expect(benchmarkService.getMarketCondition(-0.19996)).toEqual(
      'BEAR_MARKET'
    );
    expect(benchmarkService.getMarketCondition(-0.2)).toEqual('BEAR_MARKET');
  });

  it('getPerformancePercentFromAllTimeHigh', async () => {
    expect(benchmarkService.getPerformancePercentFromAllTimeHigh(0.1)).toEqual(
      0
    );
    expect(benchmarkService.getPerformancePercentFromAllTimeHigh(0)).toEqual(0);
    expect(benchmarkService.getPerformancePercentFromAllTimeHigh(-0.1)).toEqual(
      -0.1
    );
  });

  describe('addBenchmark', () => {
    it('stores the benchmark and removes the cached benchmarks', async () => {
      findFirst.mockResolvedValue({ id: 'profile-id', name: 'S&P 500' });
      getByKey.mockResolvedValue([{ symbolProfileId: 'other-profile-id' }]);

      await benchmarkService.addBenchmark({
        dataSource: DataSource.YAHOO,
        symbol: '^GSPC'
      });

      expect(put).toHaveBeenCalledWith({
        key: PROPERTY_BENCHMARKS,
        value: JSON.stringify([
          { symbolProfileId: 'other-profile-id' },
          { symbolProfileId: 'profile-id' }
        ])
      });
      expect(remove).toHaveBeenCalledWith('BENCHMARKS');
      expect(put.mock.invocationCallOrder[0]).toBeLessThan(
        remove.mock.invocationCallOrder[0]
      );
    });

    it('keeps the cached benchmarks if the asset profile is not found', async () => {
      findFirst.mockResolvedValue(null);

      const result = await benchmarkService.addBenchmark({
        dataSource: DataSource.YAHOO,
        symbol: '^GSPC'
      });

      expect(result).toBeNull();
      expect(put).not.toHaveBeenCalled();
      expect(remove).not.toHaveBeenCalled();
    });
  });

  describe('deleteBenchmark', () => {
    it('stores the remaining benchmarks and removes the cached benchmarks', async () => {
      findFirst.mockResolvedValue({ id: 'profile-id', name: 'S&P 500' });
      getByKey.mockResolvedValue([
        { symbolProfileId: 'other-profile-id' },
        { symbolProfileId: 'profile-id' }
      ]);

      await benchmarkService.deleteBenchmark({
        dataSource: DataSource.YAHOO,
        symbol: '^GSPC'
      });

      expect(put).toHaveBeenCalledWith({
        key: PROPERTY_BENCHMARKS,
        value: JSON.stringify([{ symbolProfileId: 'other-profile-id' }])
      });
      expect(remove).toHaveBeenCalledWith('BENCHMARKS');
      expect(put.mock.invocationCallOrder[0]).toBeLessThan(
        remove.mock.invocationCallOrder[0]
      );
    });

    it('keeps the cached benchmarks if the asset profile is not found', async () => {
      findFirst.mockResolvedValue(null);

      const result = await benchmarkService.deleteBenchmark({
        dataSource: DataSource.YAHOO,
        symbol: '^GSPC'
      });

      expect(result).toBeNull();
      expect(put).not.toHaveBeenCalled();
      expect(remove).not.toHaveBeenCalled();
    });
  });
});
