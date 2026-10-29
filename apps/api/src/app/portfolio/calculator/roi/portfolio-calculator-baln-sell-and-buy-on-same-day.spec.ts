import {
  activityDummyData,
  assetProfileDummyData,
  getPerformanceByDateRange,
  userDummyData
} from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator-test-utils';
import { PortfolioCalculatorFactory } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator.factory';
import { CurrentRateService } from '@ghostfolio/api/app/portfolio/current-rate.service';
import { CurrentRateServiceMock } from '@ghostfolio/api/app/portfolio/current-rate.service.mock';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { PortfolioSnapshotService } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service';
import { PortfolioSnapshotServiceMock } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service.mock';
import { RedisCacheService } from '@ghostfolio/api/services/redis-cache/redis-cache.service';
import { RedisCacheServiceMock } from '@ghostfolio/api/services/redis-cache/redis-cache.service.mock';
import { parseDate } from '@ghostfolio/common/helper';
import { Activity } from '@ghostfolio/common/interfaces';
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

jest.mock('@ghostfolio/api/services/redis-cache/redis-cache.service', () => {
  return {
    RedisCacheService: jest.fn().mockImplementation(() => {
      return RedisCacheServiceMock;
    })
  };
});

describe('PortfolioCalculator (ROI)', () => {
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
    // The second holding is BALN.SW of another data source, so that both
    // holdings have the same market prices
    const activities: Activity[] = [
      {
        ...activityDummyData,
        assetProfile: {
          ...assetProfileDummyData,
          currency: 'CHF',
          dataSource: 'YAHOO',
          name: 'Bâloise Holding AG',
          symbol: 'BALN.SW'
        },
        date: new Date('2021-11-22'),
        feeInAssetProfileCurrency: 1.55,
        feeInBaseCurrency: 1.55,
        quantity: 2,
        type: 'BUY',
        unitPriceInAssetProfileCurrency: 142.9
      },
      {
        ...activityDummyData,
        assetProfile: {
          ...assetProfileDummyData,
          currency: 'CHF',
          dataSource: 'YAHOO',
          name: 'Bâloise Holding AG',
          symbol: 'BALN.SW'
        },
        date: new Date('2021-11-30'),
        feeInAssetProfileCurrency: 1.65,
        feeInBaseCurrency: 1.65,
        quantity: 2,
        type: 'SELL',
        unitPriceInAssetProfileCurrency: 136.6
      },
      {
        ...activityDummyData,
        assetProfile: {
          ...assetProfileDummyData,
          currency: 'CHF',
          dataSource: 'EOD_HISTORICAL_DATA',
          name: 'Bâloise Holding AG',
          symbol: 'BALN.SW'
        },
        date: new Date('2021-11-30'),
        feeInAssetProfileCurrency: 0,
        feeInBaseCurrency: 0,
        quantity: 2,
        type: 'BUY',
        unitPriceInAssetProfileCurrency: 136.6
      }
    ];

    it.only('with BALN.SW sell and buy on the same day', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2021-12-18').getTime());

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.ROI,
        currency: 'CHF',
        usePortfolioSnapshotCache: false,
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

      const performanceByDateRange = await getPerformanceByDateRange({
        portfolioCalculator,
        dateRanges: ['1d', 'max']
      });

      /**
       * The invested capital of each holding is the sum of its buy amounts:
       * 2 * 136.6 CHF = 273.2 CHF and 2 * 142.9 CHF = 285.8 CHF
       */
      expect(portfolioSnapshot).toMatchObject({
        currentValueInBaseCurrency: new Big('297.8'),
        errors: [],
        hasErrors: false,
        positions: [
          {
            averageInvestment: new Big('273.2'),
            averageInvestmentWithCurrencyEffect: new Big('273.2'),
            dataSource: 'EOD_HISTORICAL_DATA',
            investment: new Big('273.2'),
            netPerformance: new Big('24.6'),
            netPerformancePercentage: new Big('0.09004392386530014641'),
            quantity: new Big('2'),
            symbol: 'BALN.SW',
            valueInBaseCurrency: new Big('297.8')
          },
          {
            averageInvestment: new Big('285.8'),
            averageInvestmentWithCurrencyEffect: new Big('285.8'),
            dataSource: 'YAHOO',
            investment: new Big('0'),
            netPerformance: new Big('-15.8'),
            netPerformancePercentage: new Big('-0.0552834149755073478'),
            quantity: new Big('0'),
            symbol: 'BALN.SW',
            valueInBaseCurrency: new Big('0')
          }
        ],
        totalFeesWithCurrencyEffect: new Big('3.2'),
        totalInvestment: new Big('273.2'),
        totalInvestmentWithCurrencyEffect: new Big('273.2')
      });

      /**
       * The sell and the buy on 2021-11-30 move the money from one holding to
       * the other. Thus the invested capital of the portfolio stays 285.8 CHF
       * and is not 285.8 CHF + 273.2 CHF = 559 CHF.
       *
       * Net performance: -15.8 CHF + 24.6 CHF = 8.8 CHF
       * Net performance in percentage: 8.8 CHF / 285.8 CHF ≈ 3.08 %
       */
      expect(portfolioSnapshot.historicalData.at(-1)).toMatchObject(
        expect.objectContaining({
          netPerformance: 8.8,
          netPerformanceInPercentage: 0.03079076277116865,
          netPerformanceInPercentageWithCurrencyEffect: 0.03079076277116865,
          netPerformanceWithCurrencyEffect: 8.8,
          totalInvestment: 273.2,
          totalInvestmentValueWithCurrencyEffect: 273.2
        })
      );

      /**
       * 1d: 2 * (148.9 CHF - 143.9 CHF) = 10 CHF / 287.8 CHF ≈ 3.47 %
       * max: the same invested capital as the chart above
       */
      expect(performanceByDateRange).toMatchObject({
        '1d': {
          date: '2021-12-18',
          netPerformance: 10,
          netPerformanceInPercentage: 0.03474635163307853,
          netPerformanceInPercentageWithCurrencyEffect: 0.03474635163307853,
          netPerformanceWithCurrencyEffect: 10,
          valueWithCurrencyEffect: 297.8
        },
        max: {
          date: '2021-12-18',
          netPerformance: 8.8,
          netPerformanceInPercentage: 0.03079076277116865,
          netPerformanceInPercentageWithCurrencyEffect: 0.03079076277116865,
          netPerformanceWithCurrencyEffect: 8.8,
          valueWithCurrencyEffect: 297.8
        }
      });
    });

    it.only('with BALN.SW sell and buy on the same day and a dividend', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2021-12-18').getTime());

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities: [
          ...activities,
          {
            ...activityDummyData,
            assetProfile: {
              ...assetProfileDummyData,
              currency: 'CHF',
              dataSource: 'EOD_HISTORICAL_DATA',
              name: 'Bâloise Holding AG',
              symbol: 'BALN.SW'
            },
            date: new Date('2021-12-17'),
            feeInAssetProfileCurrency: 0,
            feeInBaseCurrency: 0,
            quantity: 2,
            type: 'DIVIDEND',
            unitPriceInAssetProfileCurrency: 1.43
          }
        ],
        calculationType: PerformanceCalculationType.ROI,
        currency: 'CHF',
        usePortfolioSnapshotCache: false,
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

      /**
       * The dividend yield of the holding uses the invested capital of the
       * holding: (1 + 2.86 CHF / 273.2 CHF) ^ (365 / 18 days) - 1 ≈ 23.51 %
       */
      expect(portfolioSnapshot.positions[0]).toMatchObject({
        averageInvestment: new Big('273.2'),
        dataSource: 'EOD_HISTORICAL_DATA',
        dividendInBaseCurrency: new Big('2.86'),
        dividendYieldPercent: new Big('0.2351283862005056')
      });

      /**
       * The dividend yield of the portfolio uses the invested capital of the
       * portfolio, 285.8 CHF, and not the sum of the holdings, 559 CHF:
       * (1 + 2.86 CHF / 285.8 CHF) ^ (365 / 26 days) - 1 ≈ 15.00 %
       */
      expect(portfolioSnapshot).toMatchObject({
        dividendYieldPercent: new Big('0.1500260608512471'),
        dividendYieldPercentWithCurrencyEffect: new Big('0.1500260608512471')
      });
    });
  });
});
