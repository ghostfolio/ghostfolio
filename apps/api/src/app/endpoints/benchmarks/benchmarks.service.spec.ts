import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { ActivityMatchedBenchmarkService } from '@ghostfolio/api/services/benchmark/activity-matched-benchmark.service';
import { BenchmarkService } from '@ghostfolio/api/services/benchmark/benchmark.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { SymbolService } from '@ghostfolio/api/services/symbol/symbol.service';
import { parseDate } from '@ghostfolio/common/helper';
import { Filter, UserSettings } from '@ghostfolio/common/interfaces';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

import { DataSource } from '@prisma/client';

import { BenchmarksService } from './benchmarks.service';

describe('BenchmarksService', () => {
  let benchmarksService: BenchmarksService;
  let get: jest.Mock;
  let getExchangeRatesByCurrency: jest.Mock;
  let getPerformance: jest.Mock;
  let getRange: jest.Mock;
  let marketDataItems: jest.Mock;
  let getActivityMatchedMarketData: jest.Mock;

  beforeEach(() => {
    get = jest.fn().mockResolvedValue({ currency: 'USD', marketPrice: 200 });
    getExchangeRatesByCurrency = jest.fn().mockResolvedValue({});
    getPerformance = jest.fn().mockResolvedValue({
      chart: [
        { date: '2009-01-01' },
        { date: '2009-06-01' },
        { date: '2010-07-18' },
        { date: '2010-07-19' }
      ]
    });
    getRange = jest.fn().mockResolvedValue([]);
    marketDataItems = jest.fn();
    getActivityMatchedMarketData = jest.fn();

    benchmarksService = new BenchmarksService(
      new BenchmarkService(null, null, null, null, null, null),
      { getExchangeRatesByCurrency } as unknown as ExchangeRateDataService,
      { getRange, marketDataItems } as unknown as MarketDataService,
      { getPerformance } as unknown as PortfolioService,
      { get } as unknown as SymbolService,
      {
        getMarketDataForUser: getActivityMatchedMarketData
      } as unknown as ActivityMatchedBenchmarkService
    );
  });

  describe('getMarketDataForUser', () => {
    const getMarketDataForUser = ({
      endDate = parseDate('2010-07-19')
    }: { endDate?: Date } = {}) => {
      return benchmarksService.getMarketDataForUser({
        endDate,
        dataSource: DataSource.COINGECKO,
        dateRange: 'max',
        startDate: parseDate('2009-01-02'),
        symbol: 'bitcoin',
        userId: 'user-id',
        userSettings: { baseCurrency: 'CHF' }
      });
    };

    it('calculates the change since the baseline date', async () => {
      marketDataItems.mockResolvedValue([
        { date: new Date('2009-01-01'), marketPrice: 50 },
        { date: new Date('2009-06-01'), marketPrice: 25 },
        { date: new Date('2010-07-18'), marketPrice: 75 },
        { date: new Date('2010-07-19'), marketPrice: 100 }
      ]);

      await expect(getMarketDataForUser()).resolves.toEqual({
        marketData: [
          { date: '2009-01-01', value: 0 },
          { date: '2009-06-01', value: -50 },
          { date: '2010-07-18', value: 50 },
          { date: '2010-07-19', value: 100 }
        ]
      });

      expect(getRange).not.toHaveBeenCalled();
    });

    it('returns no values before the market data of the benchmark starts', async () => {
      marketDataItems.mockResolvedValue([
        { date: new Date('2010-07-18'), marketPrice: 50 },
        { date: new Date('2010-07-19'), marketPrice: 100 }
      ]);

      await expect(getMarketDataForUser()).resolves.toEqual({
        marketData: [
          { date: '2010-07-18', value: 0 },
          { date: '2010-07-19', value: 100 }
        ]
      });

      expect(getRange).toHaveBeenCalledWith({
        assetProfileIdentifiers: [
          { dataSource: DataSource.COINGECKO, symbol: 'bitcoin' }
        ],
        dateQuery: { lt: new Date('2009-01-01') },
        take: 1
      });

      expect(marketDataItems).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { date: 'asc' } })
      );
    });

    it('uses the exchange rate at the start of the market data', async () => {
      getExchangeRatesByCurrency.mockResolvedValue({
        USDCHF: {
          '2009-01-01': 2,
          '2009-06-01': 2,
          '2010-07-18': 1,
          '2010-07-19': 1.5
        }
      });

      marketDataItems.mockResolvedValue([
        { date: new Date('2010-07-18'), marketPrice: 50 },
        { date: new Date('2010-07-19'), marketPrice: 100 }
      ]);

      await expect(getMarketDataForUser()).resolves.toEqual({
        marketData: [
          { date: '2010-07-18', value: 0 },
          { date: '2010-07-19', value: 200 }
        ]
      });
    });

    it('calculates the value at the end date since the start of the market data', async () => {
      getExchangeRatesByCurrency.mockResolvedValue({
        USDCHF: {
          '2009-01-01': 2,
          '2010-07-18': 1,
          '2010-07-19': 1,
          '2010-07-20': 1.5
        }
      });

      marketDataItems.mockResolvedValue([
        { date: new Date('2010-07-18'), marketPrice: 50 },
        { date: new Date('2010-07-19'), marketPrice: 100 }
      ]);

      await expect(
        getMarketDataForUser({ endDate: parseDate('2010-07-20') })
      ).resolves.toEqual({
        marketData: [
          { date: '2010-07-18', value: 0 },
          { date: '2010-07-19', value: 100 },
          { date: '2010-07-20', value: 500 }
        ]
      });
    });

    it('returns no market data if the market data at the baseline date is missing', async () => {
      getRange.mockResolvedValue([
        { date: new Date('2008-12-31'), marketPrice: 40 }
      ]);

      marketDataItems.mockResolvedValue([
        { date: new Date('2010-07-18'), marketPrice: 50 },
        { date: new Date('2010-07-19'), marketPrice: 100 }
      ]);

      await expect(getMarketDataForUser()).resolves.toEqual({
        marketData: []
      });

      expect(getExchangeRatesByCurrency).not.toHaveBeenCalled();
    });

    it('returns no market data if the benchmark has none', async () => {
      marketDataItems.mockResolvedValue([]);

      await expect(getMarketDataForUser()).resolves.toEqual({
        marketData: []
      });
    });
  });

  describe('comparison mode dispatch', () => {
    const chart = [{ date: '2010-07-18' }, { date: '2010-07-19' }];
    const filters: Filter[] = [
      { type: 'ACCOUNT', id: 'selected-account' },
      { type: 'TAG', id: 'selected-tag' }
    ];
    const request = (userSettings: UserSettings) => ({
      dataSource: DataSource.COINGECKO,
      symbol: 'bitcoin',
      dateRange: 'max' as const,
      startDate: new Date('2010-07-18T00:00:00Z'),
      endDate: new Date('2010-07-19T00:00:00Z'),
      userId: 'authenticated-user',
      filters,
      withExcludedAccounts: false,
      userSettings
    });

    beforeEach(() => {
      getPerformance.mockResolvedValue({ chart });
      marketDataItems.mockResolvedValue([
        { date: new Date('2010-07-18T00:00:00Z'), marketPrice: 50 },
        { date: new Date('2010-07-19T00:00:00Z'), marketPrice: 100 }
      ]);
    });

    it.each([
      { baseCurrency: 'EUR' },
      { baseCurrency: 'EUR', isExperimentalFeatures: true },
      {
        baseCurrency: 'EUR',
        isExperimentalFeatures: true,
        benchmarkComparisonMode: 'TRADITIONAL'
      },
      {
        baseCurrency: 'EUR',
        isExperimentalFeatures: false,
        benchmarkComparisonMode: 'ACTIVITY_MATCHED_ROI'
      },
      {
        baseCurrency: 'EUR',
        isExperimentalFeatures: false,
        benchmarkComparisonMode: 'ACTIVITY_MATCHED_ROAI'
      },
      { baseCurrency: 'EUR', benchmarkComparisonMode: 'ACTIVITY_MATCHED_ROI' }
    ] as UserSettings[])(
      'preserves the traditional response and queries for %j',
      async (settings) => {
        expect(
          await benchmarksService.getMarketDataForUser(request(settings))
        ).toEqual({
          marketData: [
            { date: '2010-07-18', value: 0 },
            { date: '2010-07-19', value: 100 }
          ]
        });
        expect(getActivityMatchedMarketData).not.toHaveBeenCalled();
        expect(getPerformance).toHaveBeenCalledTimes(1);
        expect(get).toHaveBeenCalledTimes(1);
        expect(marketDataItems).toHaveBeenCalledTimes(1);
        expect(getExchangeRatesByCurrency).toHaveBeenCalledTimes(1);
        expect(getRange).not.toHaveBeenCalled();
      }
    );

    it.each([
      ['ACTIVITY_MATCHED_ROI', 'ROI', PerformanceCalculationType.MWR],
      ['ACTIVITY_MATCHED_ROI', 'ROI', PerformanceCalculationType.TWR],
      ['ACTIVITY_MATCHED_ROI', 'ROI', PerformanceCalculationType.ROAI],
      ['ACTIVITY_MATCHED_ROI', 'ROI', PerformanceCalculationType.ROI],
      ['ACTIVITY_MATCHED_ROAI', 'ROAI', PerformanceCalculationType.MWR],
      ['ACTIVITY_MATCHED_ROAI', 'ROAI', PerformanceCalculationType.TWR],
      ['ACTIVITY_MATCHED_ROAI', 'ROAI', PerformanceCalculationType.ROI],
      ['ACTIVITY_MATCHED_ROAI', 'ROAI', PerformanceCalculationType.ROAI]
    ] as const)(
      'dispatches %s as %s independently from portfolio method %s',
      async (benchmarkComparisonMode, method, performanceCalculationType) => {
        const response = {
          marketData: [
            { date: '2010-07-18', value: 0 },
            { date: '2010-07-19', value: 12.5 }
          ]
        };
        getActivityMatchedMarketData.mockResolvedValue(response);
        const args = request({
          baseCurrency: 'EUR',
          isExperimentalFeatures: true,
          benchmarkComparisonMode,
          performanceCalculationType
        });
        expect(await benchmarksService.getMarketDataForUser(args)).toBe(
          response
        );
        expect(getPerformance.mock.calls).toEqual([
          [
            {
              dateRange: 'max',
              filters,
              userId: 'authenticated-user',
              withExcludedAccounts: false
            }
          ]
        ]);
        expect(getActivityMatchedMarketData.mock.calls).toEqual([
          [
            {
              userId: 'authenticated-user',
              filters,
              dataSource: DataSource.COINGECKO,
              symbol: 'bitcoin',
              currency: 'EUR',
              valuationDates: ['2010-07-18', '2010-07-19'],
              start: '2010-07-18',
              end: '2010-07-19',
              method
            }
          ]
        ]);
        for (const mock of [
          get,
          marketDataItems,
          getRange,
          getExchangeRatesByCurrency
        ])
          expect(mock).not.toHaveBeenCalled();
      }
    );

    it('passes an empty chart to the activity-matched service without traditional queries', async () => {
      getPerformance.mockResolvedValue({ chart: [] });
      getActivityMatchedMarketData.mockResolvedValue({ marketData: [] });
      expect(
        await benchmarksService.getMarketDataForUser(
          request({
            baseCurrency: 'EUR',
            isExperimentalFeatures: true,
            benchmarkComparisonMode: 'ACTIVITY_MATCHED_ROI'
          })
        )
      ).toEqual({ marketData: [] });
      expect(getActivityMatchedMarketData).toHaveBeenCalledWith(
        expect.objectContaining({ valuationDates: [] })
      );
      expect(getPerformance).toHaveBeenCalledTimes(1);
      for (const mock of [
        get,
        marketDataItems,
        getRange,
        getExchangeRatesByCurrency
      ])
        expect(mock).not.toHaveBeenCalled();
    });

    it('preserves traditional empty-chart query behavior', async () => {
      getPerformance.mockResolvedValue({ chart: [] });
      expect(
        await benchmarksService.getMarketDataForUser(
          request({ baseCurrency: 'EUR' })
        )
      ).toEqual({ marketData: [] });
      expect(getActivityMatchedMarketData).not.toHaveBeenCalled();
      expect(get).toHaveBeenCalledTimes(1);
      expect(marketDataItems).toHaveBeenCalledWith({
        orderBy: { date: 'asc' },
        where: {
          dataSource: DataSource.COINGECKO,
          symbol: 'bitcoin',
          date: { in: [] }
        }
      });
      expect(getExchangeRatesByCurrency).not.toHaveBeenCalled();
    });

    it('propagates activity-matched errors without a traditional fallback', async () => {
      const error = new Error('Missing FX rate: USDEUR 2010-07-18');
      getActivityMatchedMarketData.mockRejectedValue(error);
      await expect(
        benchmarksService.getMarketDataForUser(
          request({
            baseCurrency: 'EUR',
            isExperimentalFeatures: true,
            benchmarkComparisonMode: 'ACTIVITY_MATCHED_ROAI'
          })
        )
      ).rejects.toBe(error);
      expect(getPerformance).toHaveBeenCalledTimes(1);
      for (const mock of [
        get,
        marketDataItems,
        getRange,
        getExchangeRatesByCurrency
      ])
        expect(mock).not.toHaveBeenCalled();
    });
  });
});
