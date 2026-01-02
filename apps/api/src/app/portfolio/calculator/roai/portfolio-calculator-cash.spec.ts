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
import { ExchangeRateDataServiceMock } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service.mock';
import { PortfolioSnapshotService } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service';
import { PortfolioSnapshotServiceMock } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service.mock';
import { parseDate } from '@ghostfolio/common/helper';
import { Activity, HistoricalDataItem } from '@ghostfolio/common/interfaces';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

import { randomUUID } from 'node:crypto';

jest.mock('@ghostfolio/api/app/portfolio/current-rate.service', () => {
  return {
    CurrentRateService: jest.fn().mockImplementation(() => {
      return CurrentRateServiceMock;
    })
  };
});

jest.mock(
  '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service',
  () => {
    return {
      ExchangeRateDataService: jest.fn().mockImplementation(() => {
        return ExchangeRateDataServiceMock;
      })
    };
  }
);

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

describe('PortfolioCalculator', () => {
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

  describe('Cash Performance', () => {
    it('should calculate performance for cash assets in CHF default currency', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2025-01-01').getTime());

      const accountId = randomUUID();

      const syntheticActivities: Activity[] = [
        {
          ...activityDummyData,
          accountId,
          comment: 'Synthetic Cash Start',
          currency: 'USD',
          date: parseDate('2023-12-31'),
          feeInAssetProfileCurrency: 0,
          quantity: 1000,
          type: 'BUY',
          SymbolProfile: {
            ...symbolProfileDummyData,
            assetSubClass: 'CASH',
            currency: 'USD',
            dataSource: 'MANUAL',
            name: 'USD',
            symbol: 'USD'
          },
          unitPriceInAssetProfileCurrency: 1
        },
        {
          ...activityDummyData,
          accountId,
          comment: 'Synthetic Cash Increment',
          currency: 'USD',
          date: parseDate('2024-12-31'),
          feeInAssetProfileCurrency: 0,
          quantity: 1000, // +1000 to reach 2000 total
          type: 'BUY',
          SymbolProfile: {
            ...symbolProfileDummyData,
            assetSubClass: 'CASH',
            currency: 'USD',
            dataSource: 'MANUAL',
            name: 'USD',
            symbol: 'USD'
          },
          unitPriceInAssetProfileCurrency: 1
        }
      ];

      jest.spyOn(currentRateService, 'getValues').mockResolvedValue({
        dataProviderInfos: [],
        errors: [],
        values: []
      });

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities: syntheticActivities,
        calculationType: PerformanceCalculationType.ROAI,
        currency: 'CHF',
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

      const historicalData20231231 = portfolioSnapshot.historicalData.find(
        ({ date }) => date === '2023-12-31'
      );
      const historicalData20240101 = portfolioSnapshot.historicalData.find(
        ({ date }) => date === '2024-01-01'
      );
      const historicalData20241231 = portfolioSnapshot.historicalData.find(
        ({ date }) => date === '2024-12-31'
      );

      /**
       * Expected logic:
       * Investment value with currency effect: 1000 USD * 0.85 = 850 CHF
       * Total investment: 1000 USD * 0.91 = 910 CHF
       * Value (current): 1000 USD * 0.91 = 910 CHF
       * Value with currency effect: 1000 USD * 0.85 = 850 CHF
       */
      expect(historicalData20231231).toMatchObject({
        date: '2023-12-31',
        investmentValueWithCurrencyEffect: 850,
        netPerformance: 0,
        netPerformanceInPercentage: 0,
        netPerformanceInPercentageWithCurrencyEffect: 0,
        netPerformanceWithCurrencyEffect: 0,
        netWorth: 850,
        totalAccountBalance: 0,
        totalInvestment: 910,
        totalInvestmentValueWithCurrencyEffect: 850,
        value: 910,
        valueWithCurrencyEffect: 850
      });

      /**
       * Expected logic:
       * Net performance with currency effect: (1000 * 0.86) - (1000 * 0.85) = 10 CHF
       * Total investment: 1000 USD * 0.91 = 910 CHF
       * Total investment value with currency effect: 1000 USD * 0.85 = 850 CHF
       * Value (current): 1000 USD * 0.91 = 910 CHF
       * Value with currency effect: 1000 USD * 0.86 = 860 CHF
       */
      expect(historicalData20240101).toMatchObject({
        date: '2024-01-01',
        investmentValueWithCurrencyEffect: 0,
        netPerformance: 0,
        netPerformanceInPercentage: 0,
        netPerformanceInPercentageWithCurrencyEffect: 0.011764705882352941,
        netPerformanceWithCurrencyEffect: 10,
        netWorth: 860,
        totalAccountBalance: 0,
        totalInvestment: 910,
        totalInvestmentValueWithCurrencyEffect: 850,
        value: 910,
        valueWithCurrencyEffect: 860
      });

      /**
       * Expected logic:
       * Investment value with currency effect: 1000 USD * 0.90 = 900 CHF
       * Net performance: (1000 USD * 1.0) - (1000 USD * 1.0) = 0 CHF
       * Net performance with currency effect: (1000 USD * 0.9) - (1000 USD * 0.85) = 50 CHF
       * Total investment: 2000 USD * 0.91 = 1820 CHF
       * Total investment value with currency effect: (1000 USD * 0.85) + (1000 USD * 0.90) = 1750 CHF
       * Value (current): 2000 USD * 0.91 = 1820 CHF
       * Value with currency effect: 2000 USD * 0.9 = 1800 CHF
       */
      expect(historicalData20241231).toMatchObject<HistoricalDataItem>({
        date: '2024-12-31',
        investmentValueWithCurrencyEffect: 900,
        netPerformance: 0,
        netPerformanceInPercentage: 0,
        netPerformanceInPercentageWithCurrencyEffect: 0.058823529411764705,
        netPerformanceWithCurrencyEffect: 50,
        netWorth: 1800,
        totalAccountBalance: 0,
        totalInvestment: 1820,
        totalInvestmentValueWithCurrencyEffect: 1750,
        value: 1820,
        valueWithCurrencyEffect: 1800
      });
    });
  });
});
