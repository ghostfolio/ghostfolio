import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { SymbolService } from '@ghostfolio/api/app/symbol/symbol.service';
import { BenchmarkService } from '@ghostfolio/api/services/benchmark/benchmark.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';

import { BenchmarksService } from './benchmarks.service';

describe('BenchmarksService', () => {
  let benchmarksService: BenchmarksService;

  const mockBenchmarkService = {
    calculateChangeInPercentage: jest.fn(
      (startPrice: number, endPrice: number) => {
        return (endPrice - startPrice) / startPrice;
      }
    )
  };

  const mockExchangeRateDataService = {
    getExchangeRatesByCurrency: jest.fn().mockResolvedValue({})
  };

  const mockMarketDataService = {
    marketDataItems: jest.fn()
  };

  const mockPortfolioService = {
    getPerformance: jest.fn()
  };

  const mockSymbolService = {
    get: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();

    benchmarksService = new BenchmarksService(
      mockBenchmarkService as unknown as BenchmarkService,
      mockExchangeRateDataService as unknown as ExchangeRateDataService,
      mockMarketDataService as unknown as MarketDataService,
      mockPortfolioService as unknown as PortfolioService,
      mockSymbolService as unknown as SymbolService
    );
  });

  describe('getMarketDataForUser', () => {
    it('returns benchmark data for a calendar year with the first chart date as baseline', async () => {
      const startDate = new Date(2024, 11, 31, 23, 59, 59, 999);
      const endDate = new Date(2025, 11, 31, 23, 59, 59, 999);

      mockPortfolioService.getPerformance.mockResolvedValue({
        chart: [
          { date: '2025-01-01', value: 0 },
          { date: '2025-06-30', value: 10 },
          { date: '2025-12-31', value: 20 }
        ]
      });

      mockSymbolService.get.mockResolvedValue({
        currency: 'USD',
        marketPrice: 150
      });

      mockMarketDataService.marketDataItems.mockResolvedValue([
        { date: new Date(Date.UTC(2025, 0, 1)), marketPrice: 100 },
        { date: new Date(Date.UTC(2025, 5, 30)), marketPrice: 120 },
        { date: new Date(Date.UTC(2025, 11, 31)), marketPrice: 150 }
      ]);

      const result = await benchmarksService.getMarketDataForUser({
        dataSource: 'YAHOO',
        dateRange: '2025',
        endDate,
        filters: [],
        startDate,
        symbol: 'VOO',
        userId: 'user-1',
        userSettings: { baseCurrency: 'USD' }
      });

      expect(result.marketData.length).toBeGreaterThan(0);

      const baselineItem = result.marketData.find(
        ({ date }) => date === '2025-01-01'
      );
      expect(baselineItem).toBeDefined();
      expect(baselineItem.value).toBe(0);

      const junItem = result.marketData.find(
        ({ date }) => date === '2025-06-30'
      );
      expect(junItem).toEqual({
        date: '2025-06-30',
        value: expect.closeTo(((120 - 100) / 100) * 100, 10)
      });

      const decItem = result.marketData.find(
        ({ date }) => date === '2025-12-31'
      );
      expect(decItem).toEqual({
        date: '2025-12-31',
        value: expect.closeTo(((150 - 100) / 100) * 100, 10)
      });
    });

    it('uses resetHours(startDate) as the baseline when the chart is empty', async () => {
      const startDate = new Date(2024, 11, 31, 23, 59, 59, 999);

      mockPortfolioService.getPerformance.mockResolvedValue({
        chart: []
      });

      mockSymbolService.get.mockResolvedValue({
        currency: 'USD',
        marketPrice: 150
      });

      mockMarketDataService.marketDataItems.mockResolvedValue([
        { date: new Date(Date.UTC(2024, 11, 31)), marketPrice: 100 }
      ]);

      const result = await benchmarksService.getMarketDataForUser({
        dataSource: 'YAHOO',
        dateRange: '2025',
        filters: [],
        startDate,
        symbol: 'VOO',
        userId: 'user-1',
        userSettings: { baseCurrency: 'USD' }
      });

      const baselineItem = result.marketData.find(
        ({ date }) => date === '2024-12-31'
      );
      expect(baselineItem).toBeDefined();
      expect(baselineItem.value).toBe(0);
    });
  });
});
