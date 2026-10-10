/**
 * @jest-environment <rootDir>/jest-environment-tz.js
 * @jest-environment-options {"timeZone": "America/New_York"}
 */
import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { SymbolService } from '@ghostfolio/api/app/symbol/symbol.service';
import { BenchmarkService } from '@ghostfolio/api/services/benchmark/benchmark.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { parseDate } from '@ghostfolio/common/helper';

import { DataSource } from '@prisma/client';

import { BenchmarksService } from './benchmarks.service';

describe('BenchmarksService in a time zone behind UTC', () => {
  let benchmarksService: BenchmarksService;

  beforeEach(() => {
    benchmarksService = new BenchmarksService(
      new BenchmarkService(null, null, null, null, null, null),
      {
        getExchangeRatesByCurrency: jest.fn().mockResolvedValue({})
      } as unknown as ExchangeRateDataService,
      {
        getRange: jest.fn().mockResolvedValue([]),
        // The market data is stored at midnight (UTC)
        marketDataItems: jest.fn().mockResolvedValue([
          { date: new Date('2010-07-18T00:00:00.000Z'), marketPrice: 50 },
          { date: new Date('2010-07-19T00:00:00.000Z'), marketPrice: 100 }
        ])
      } as unknown as MarketDataService,
      {
        getPerformance: jest.fn().mockResolvedValue({
          chart: [{ date: '2010-07-18' }, { date: '2010-07-19' }]
        })
      } as unknown as PortfolioService,
      {
        get: jest.fn().mockResolvedValue({ currency: 'USD', marketPrice: 200 })
      } as unknown as SymbolService
    );
  });

  it('returns the dates of the market data without a shift', async () => {
    await expect(
      benchmarksService.getMarketDataForUser({
        dataSource: DataSource.COINGECKO,
        dateRange: 'max',
        endDate: parseDate('2010-07-19'),
        startDate: parseDate('2010-07-18'),
        symbol: 'bitcoin',
        userId: 'user-id',
        userSettings: { baseCurrency: 'USD' }
      })
    ).resolves.toEqual({
      marketData: [
        { date: '2010-07-18', value: 0 },
        { date: '2010-07-19', value: 100 }
      ]
    });
  });
});
