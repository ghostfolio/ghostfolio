import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import { RedisCacheService } from '@ghostfolio/api/services/redis-cache/redis-cache.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
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

  describe('getAllTimeHighPerformance', () => {
    it('gives the performance from the all time high and the market condition', () => {
      expect(
        benchmarkService.getAllTimeHighPerformance({
          allTimeHighMarketPrice: 100,
          marketPrice: 100
        })
      ).toEqual({ marketCondition: 'ALL_TIME_HIGH', performancePercent: 0 });

      expect(
        benchmarkService.getAllTimeHighPerformance({
          allTimeHighMarketPrice: 100,
          marketPrice: 110
        })
      ).toEqual({ marketCondition: 'ALL_TIME_HIGH', performancePercent: 0 });

      expect(
        benchmarkService.getAllTimeHighPerformance({
          allTimeHighMarketPrice: 100,
          marketPrice: 90
        })
      ).toEqual({
        marketCondition: 'NEUTRAL_MARKET',
        performancePercent: -0.1
      });

      expect(
        benchmarkService.getAllTimeHighPerformance({
          allTimeHighMarketPrice: 100,
          marketPrice: 75
        })
      ).toEqual({ marketCondition: 'BEAR_MARKET', performancePercent: -0.25 });
    });

    it.each([
      { allTimeHighMarketPrice: undefined, marketPrice: 100 },
      { allTimeHighMarketPrice: 100, marketPrice: undefined },
      { allTimeHighMarketPrice: undefined, marketPrice: undefined },
      { allTimeHighMarketPrice: 100, marketPrice: 0 }
    ])(
      'gives no all time high without market data (all time high: $allTimeHighMarketPrice, market price: $marketPrice)',
      ({ allTimeHighMarketPrice, marketPrice }) => {
        expect(
          benchmarkService.getAllTimeHighPerformance({
            allTimeHighMarketPrice,
            marketPrice
          })
        ).toEqual({
          marketCondition: 'NEUTRAL_MARKET',
          performancePercent: undefined
        });
      }
    );
  });

  describe('getBenchmarks', () => {
    const createBenchmarkService = ({
      quotes
    }: {
      quotes: { [assetProfileIdentifier: string]: { marketPrice: number } };
    }) => {
      const set = jest.fn().mockResolvedValue(undefined);

      return {
        set,
        benchmarkService: new BenchmarkService(
          {
            getQuotes: jest.fn().mockResolvedValue(quotes)
          } as unknown as DataProviderService,
          {
            getMax: jest.fn().mockResolvedValue({
              date: new Date('2026-10-01T00:00:00.000Z'),
              marketPrice: 100
            }),
            marketDataItems: jest.fn().mockResolvedValue([])
          } as unknown as MarketDataService,
          null,
          {
            getByKey: jest
              .fn()
              .mockResolvedValue([{ symbolProfileId: 'profile-id' }])
          } as unknown as PropertyService,
          { set } as unknown as RedisCacheService,
          {
            getSymbolProfilesByIds: jest.fn().mockResolvedValue([
              {
                dataSource: DataSource.YAHOO,
                id: 'profile-id',
                name: 'S&P 500',
                symbol: '^GSPC'
              }
            ])
          } as unknown as SymbolProfileService
        )
      };
    };

    it('gives the market condition of a benchmark', async () => {
      const { benchmarkService, set } = createBenchmarkService({
        quotes: { 'YAHOO-^GSPC': { marketPrice: 75 } }
      });

      const [benchmark] = await benchmarkService.getBenchmarks({
        useCache: false
      });

      expect(benchmark).toMatchObject({
        marketCondition: 'BEAR_MARKET',
        performances: { allTimeHigh: { performancePercent: -0.25 } }
      });
      expect(set).toHaveBeenCalledTimes(1);
    });

    it('does not give the all time high of a benchmark without a quote', async () => {
      const { benchmarkService, set } = createBenchmarkService({ quotes: {} });

      const [benchmark] = await benchmarkService.getBenchmarks({
        useCache: false
      });

      expect(benchmark.marketCondition).toEqual('NEUTRAL_MARKET');
      expect(
        benchmark.performances.allTimeHigh.performancePercent
      ).toBeUndefined();
      expect(set).not.toHaveBeenCalled();
    });
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
