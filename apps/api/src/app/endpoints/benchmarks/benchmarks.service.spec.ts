import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { SymbolService } from '@ghostfolio/api/app/symbol/symbol.service';
import { BenchmarkService } from '@ghostfolio/api/services/benchmark/benchmark.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { parseDate } from '@ghostfolio/common/helper';

import { DataSource } from '@prisma/client';

import { BenchmarksService } from './benchmarks.service';

describe('BenchmarksService', () => {
  let benchmarksService: BenchmarksService;
  let getExchangeRatesByCurrency: jest.Mock;
  let getPerformance: jest.Mock;
  let get: jest.Mock;
  let marketDataItems: jest.Mock;

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
    marketDataItems = jest.fn();

    benchmarksService = new BenchmarksService(
      new BenchmarkService(null, null, null, null, null, null),
      { getExchangeRatesByCurrency } as unknown as ExchangeRateDataService,
      { marketDataItems } as unknown as MarketDataService,
      { getPerformance } as unknown as PortfolioService,
      { get } as unknown as SymbolService
    );
  });

  describe('getMarketDataForUser', () => {
    const getMarketDataForUser = () => {
      return benchmarksService.getMarketDataForUser({
        dataSource: DataSource.COINGECKO,
        dateRange: 'max',
        endDate: parseDate('2010-07-19'),
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
    });

    it('returns 0% before the market data of the benchmark starts', async () => {
      marketDataItems.mockResolvedValue([
        { date: new Date('2010-07-18'), marketPrice: 50 },
        { date: new Date('2010-07-19'), marketPrice: 100 }
      ]);

      await expect(getMarketDataForUser()).resolves.toEqual({
        marketData: [
          { date: '2009-01-01', value: 0 },
          { date: '2009-06-01', value: 0 },
          { date: '2010-07-18', value: 0 },
          { date: '2010-07-19', value: 100 }
        ]
      });
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
          { date: '2009-01-01', value: 0 },
          { date: '2009-06-01', value: 0 },
          { date: '2010-07-18', value: 0 },
          { date: '2010-07-19', value: 200 }
        ]
      });
    });

    it('returns no market data if the benchmark has none', async () => {
      marketDataItems.mockResolvedValue([]);

      await expect(getMarketDataForUser()).resolves.toEqual({
        marketData: []
      });
    });
  });
});
