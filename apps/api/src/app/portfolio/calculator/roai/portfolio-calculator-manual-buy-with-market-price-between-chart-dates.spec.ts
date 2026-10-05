import {
  activityDummyData,
  assetProfileDummyData,
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
import type { Activity } from '@ghostfolio/common/interfaces';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

import { Big } from 'big.js';

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

describe('PortfolioCalculator', () => {
  let configurationService: ConfigurationService;
  let currentRateService: CurrentRateService;
  let exchangeRateDataService: ExchangeRateDataService;
  let portfolioCalculatorFactory: PortfolioCalculatorFactory;
  let portfolioSnapshotService: PortfolioSnapshotService;
  let redisCacheService: RedisCacheService;

  beforeEach(() => {
    PortfolioSnapshotServiceMock.reset();
    RedisCacheServiceMock.reset();

    configurationService = new ConfigurationService();

    currentRateService = new CurrentRateService(null, null, null);

    exchangeRateDataService = new ExchangeRateDataService(
      null,
      null,
      null,
      null
    );

    portfolioSnapshotService = new PortfolioSnapshotService(null, null);

    redisCacheService = new RedisCacheService(null, null);

    portfolioCalculatorFactory = new PortfolioCalculatorFactory(
      configurationService,
      currentRateService,
      exchangeRateDataService,
      portfolioSnapshotService,
      redisCacheService
    );
  });

  describe('get current positions', () => {
    it('with MANUAL buy and market price between two chart dates', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2024-01-31').getTime());

      const activities: Activity[] = [
        {
          ...activityDummyData,
          assetProfile: {
            ...assetProfileDummyData,
            currency: 'USD',
            dataSource: 'MANUAL',
            name: 'Private Investment',
            symbol: '6c0c5cee-0208-4975-b473-03baf2518497'
          },
          date: parseDate('2021-01-04'),
          feeInAssetProfileCurrency: 0,
          feeInBaseCurrency: 0,
          quantity: 10,
          type: 'BUY',
          unitPriceInAssetProfileCurrency: 50
        }
      ];

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.ROAI,
        currency: 'USD',
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

      const historicalDataByDate = Object.fromEntries(
        portfolioSnapshot.historicalData.map((historicalDataItem) => {
          return [historicalDataItem.date, historicalDataItem];
        })
      );

      /**
       * The only historical market prices are on 2023-06-14 and 2023-06-15,
       * which are not chart dates (every third day from 2021-01-03)
       */
      expect(historicalDataByDate['2023-06-14']).toBeUndefined();
      expect(historicalDataByDate['2023-06-15']).toBeUndefined();

      /**
       * The chart dates before the market prices use the unit price of the
       * activity: 50
       */
      expect(historicalDataByDate['2023-06-13']).toMatchObject({
        netPerformance: 0, // 10 * (50 - 50) = 0
        totalInvestment: 500,
        value: 500 // 10 * 50 = 500
      });

      /**
       * The chart dates after the market prices carry the latest one forward
       * (100), not the first one (80)
       */
      expect(historicalDataByDate['2023-06-16']).toMatchObject({
        netPerformance: 500, // 10 * (100 - 50) = 500
        totalInvestment: 500,
        value: 1000 // 10 * 100 = 1000
      });

      expect(historicalDataByDate['2024-01-30']).toMatchObject({
        netPerformance: 500, // 10 * (100 - 50) = 500
        totalInvestment: 500,
        value: 1000 // 10 * 100 = 1000
      });

      /**
       * The market price is unchanged since 2023-06-15, hence there is no
       * performance today
       */
      expect(portfolioSnapshot.positions[0]).toMatchObject({
        netPerformancePercentageWithCurrencyEffectMap: {
          '1d': new Big(0)
        },
        netPerformanceWithCurrencyEffectMap: {
          '1d': new Big(0),
          max: new Big(500) // 10 * (100 - 50) = 500
        }
      });
    });
  });
});
