import {
  activityDummyData,
  symbolProfileDummyData,
  userDummyData
} from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator-test-utils';
import { PortfolioCalculatorFactory } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator.factory';
import { CurrentRateService } from '@ghostfolio/api/app/portfolio/current-rate.service';
import { CurrentRateServiceMock } from '@ghostfolio/api/app/portfolio/current-rate.service.mock';
import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { RedisCacheServiceMock } from '@ghostfolio/api/app/redis-cache/redis-cache.service.mock';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { PortfolioSnapshotService } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service';
import { PortfolioSnapshotServiceMock } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service.mock';
import { parseDate } from '@ghostfolio/common/helper';
import { Activity } from '@ghostfolio/common/interfaces';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

jest.mock('@ghostfolio/api/app/portfolio/current-rate.service', () => {
  return {
    CurrentRateService: jest.fn().mockImplementation(() => {
      return CurrentRateServiceMock;
    })
  };
});

jest.mock(
  '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service',
  () => {
    return {
      PortfolioSnapshotService: jest.fn().mockImplementation(() => {
        return PortfolioSnapshotServiceMock;
      })
    };
  }
);

jest.mock('@ghostfolio/api/app/redis-cache/redis-cache.service', () => {
  return {
    RedisCacheService: jest.fn().mockImplementation(() => {
      return RedisCacheServiceMock;
    })
  };
});

describe('PortfolioCalculator - Calendar Year Boundaries', () => {
  let configurationService: ConfigurationService;
  let currentRateService: CurrentRateService;
  let exchangeRateDataService: ExchangeRateDataService;
  let portfolioCalculatorFactory: PortfolioCalculatorFactory;
  let portfolioSnapshotService: PortfolioSnapshotService;
  let redisCacheService: RedisCacheService;

  beforeEach(() => {
    configurationService = new ConfigurationService();

    currentRateService = new CurrentRateService(null, null, null, null);

    exchangeRateDataService = new ExchangeRateDataService(
      null,
      null,
      null,
      null
    );

    portfolioSnapshotService = new PortfolioSnapshotService(null);

    redisCacheService = new RedisCacheService(null, null);

    portfolioCalculatorFactory = new PortfolioCalculatorFactory(
      configurationService,
      currentRateService,
      exchangeRateDataService,
      portfolioSnapshotService,
      redisCacheService
    );
  });

  describe('calendar year boundaries in chart dates', () => {
    it('should include first and last date of each calendar year spanning multiple years', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2023-06-15').getTime());

      const activities: Activity[] = [
        {
          ...activityDummyData,
          date: new Date('2021-03-15'),
          feeInAssetProfileCurrency: 0,
          quantity: 10,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: 'USD',
            dataSource: 'YAHOO',
            name: 'Test Stock',
            symbol: 'TEST'
          },
          type: 'BUY',
          unitPriceInAssetProfileCurrency: 100
        }
      ];

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.ROAI,
        currency: 'USD',
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

      // Extract all chart dates from historical data
      const chartDates = portfolioSnapshot.historicalData.map(
        (item) => item.date
      );

      // Verify year boundaries for 2021
      // 2021-01-01 is before first activity (2021-03-15), so should NOT be included
      expect(chartDates).not.toContain('2021-01-01');
      expect(chartDates).toContain('2021-12-31');

      // Verify year boundaries for 2022
      expect(chartDates).toContain('2022-01-01');
      expect(chartDates).toContain('2022-12-31');

      // Verify year boundaries for 2023
      expect(chartDates).toContain('2023-01-01');
      // 2023-12-31 is after current date (2023-06-15), so should NOT be included
      expect(chartDates).not.toContain('2023-12-31');

      jest.useRealTimers();
    });

    it('should include year boundaries only within the date range', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2022-06-15').getTime());

      const activities: Activity[] = [
        {
          ...activityDummyData,
          date: new Date('2021-06-15'),
          feeInAssetProfileCurrency: 0,
          quantity: 10,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: 'USD',
            dataSource: 'YAHOO',
            name: 'Test Stock',
            symbol: 'TEST'
          },
          type: 'BUY',
          unitPriceInAssetProfileCurrency: 100
        }
      ];

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.ROAI,
        currency: 'USD',
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

      const chartDates = portfolioSnapshot.historicalData.map(
        (item) => item.date
      );

      // 2021-01-01 should NOT be included (before start date 2021-06-15)
      expect(chartDates).not.toContain('2021-01-01');

      // 2021-12-31 should be included (within range)
      expect(chartDates).toContain('2021-12-31');

      // 2022-01-01 should be included (within range)
      expect(chartDates).toContain('2022-01-01');

      // 2022-12-31 should NOT be included (after end date 2022-06-15)
      expect(chartDates).not.toContain('2022-12-31');

      jest.useRealTimers();
    });

    it('should include year boundaries for a single year', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2021-12-31').getTime());

      const activities: Activity[] = [
        {
          ...activityDummyData,
          date: new Date('2021-03-01'),
          feeInAssetProfileCurrency: 0,
          quantity: 10,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: 'USD',
            dataSource: 'YAHOO',
            name: 'Test Stock',
            symbol: 'TEST'
          },
          type: 'BUY',
          unitPriceInAssetProfileCurrency: 100
        }
      ];

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.ROAI,
        currency: 'USD',
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

      const chartDates = portfolioSnapshot.historicalData.map(
        (item) => item.date
      );

      // 2021-01-01 is before first activity (2021-03-01), so should NOT be included
      expect(chartDates).not.toContain('2021-01-01');
      // 2021-12-31 should be included (matches current date)
      expect(chartDates).toContain('2021-12-31');

      jest.useRealTimers();
    });
  });
});
