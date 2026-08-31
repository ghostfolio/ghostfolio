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

    currentRateService = new CurrentRateService(null, null, null, null);

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
    it('with BTCUSD buy before the first known market price', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2022-01-14').getTime());

      const activities: Activity[] = [
        {
          ...activityDummyData,
          assetProfile: {
            ...assetProfileDummyData,
            currency: 'USD',
            dataSource: 'YAHOO',
            name: 'Bitcoin',
            symbol: 'BTCUSD'
          },
          date: parseDate('2014-06-01'),
          feeInAssetProfileCurrency: 0,
          feeInBaseCurrency: 0,
          quantity: 1,
          type: 'BUY',
          unitPriceInAssetProfileCurrency: 500
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
       * The first known market price of BTCUSD is on 2015-01-01. The chart
       * dates before it must not be valued with a future price, hence they use
       * the unit price of the activity: 500
       */
      expect(historicalDataByDate['2014-06-01']).toMatchObject({
        netPerformance: 0, // 1 * (500 - 500) = 0
        netPerformanceInPercentage: 0,
        totalInvestment: 500,
        value: 500 // 1 * 500 = 500
      });

      expect(historicalDataByDate['2014-12-31']).toMatchObject({
        netPerformance: 0, // 1 * (500 - 500) = 0
        netPerformanceInPercentage: 0,
        totalInvestment: 500,
        value: 500 // 1 * 500 = 500
      });

      /**
       * Closing price on 2015-01-01: 314.25
       */
      expect(historicalDataByDate['2015-01-01']).toMatchObject({
        netPerformance: -185.75, // 1 * (314.25 - 500) = -185.75
        netPerformanceInPercentage: -0.3715, // -185.75 ÷ 500 = -0.3715
        totalInvestment: 500,
        value: 314.25 // 1 * 314.25 = 314.25
      });

      /**
       * Closing price on 2022-01-14: 43099.7
       */
      expect(portfolioSnapshot.historicalData.at(-1)).toMatchObject({
        date: '2022-01-14',
        netPerformance: 42599.7, // 1 * (43099.7 - 500) = 42599.7
        totalInvestment: 500,
        value: 43099.7 // 1 * 43099.7 = 43099.7
      });
    });
  });
});
