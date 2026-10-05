import {
  activityDummyData,
  assetProfileDummyData,
  getPerformanceByDateRange,
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
    it('with GOOGL fee and dividend', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2023-07-10').getTime());

      const activities: Activity[] = [
        {
          ...activityDummyData,
          assetProfile: {
            ...assetProfileDummyData,
            currency: 'USD',
            dataSource: 'YAHOO',
            name: 'Microsoft Inc.',
            symbol: 'MSFT'
          },
          date: new Date('2021-09-16'),
          feeInAssetProfileCurrency: 19,
          feeInBaseCurrency: 19,
          quantity: 1,
          type: 'BUY',
          unitPriceInAssetProfileCurrency: 298.58
        },
        {
          ...activityDummyData,
          assetProfile: {
            ...assetProfileDummyData,
            currency: 'USD',
            dataSource: 'YAHOO',
            name: 'Microsoft Inc.',
            symbol: 'MSFT'
          },
          date: new Date('2021-11-16'),
          feeInAssetProfileCurrency: 0,
          feeInBaseCurrency: 0,
          quantity: 1,
          type: 'DIVIDEND',
          unitPriceInAssetProfileCurrency: 0.62
        },
        {
          // The first activity of this asset profile is a fee, which is not an
          // investment activity. Thus the holding is not included in the
          // holdings of the portfolio summary, and its dividend must not be
          // included in the chart
          ...activityDummyData,
          assetProfile: {
            ...assetProfileDummyData,
            currency: 'USD',
            dataSource: 'YAHOO',
            name: 'Alphabet Inc.',
            symbol: 'GOOGL'
          },
          date: new Date('2023-01-03'),
          feeInAssetProfileCurrency: 1,
          feeInBaseCurrency: 1,
          quantity: 0,
          type: 'FEE',
          unitPriceInAssetProfileCurrency: 0
        },
        {
          ...activityDummyData,
          assetProfile: {
            ...assetProfileDummyData,
            currency: 'USD',
            dataSource: 'YAHOO',
            name: 'Alphabet Inc.',
            symbol: 'GOOGL'
          },
          date: new Date('2023-07-10'),
          feeInAssetProfileCurrency: 0,
          feeInBaseCurrency: 0,
          quantity: 1,
          type: 'DIVIDEND',
          unitPriceInAssetProfileCurrency: 5
        }
      ];

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.ROAI,
        currency: 'USD',
        usePortfolioSnapshotCache: false,
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

      const dividendInBaseCurrency =
        await portfolioCalculator.getDividendInBaseCurrency();

      expect(
        portfolioSnapshot.positions.map(({ symbol }) => {
          return symbol;
        })
      ).toEqual(['MSFT']);

      // The chart and the portfolio summary must show the same dividend
      expect(dividendInBaseCurrency).toEqual(new Big('0.62'));

      expect(
        portfolioSnapshot.historicalData.at(-1).dividendInBaseCurrency
      ).toEqual(0.62);
    });

    it('with GOOGL dividend without investment', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2023-07-10').getTime());

      const activities: Activity[] = [
        {
          ...activityDummyData,
          assetProfile: {
            ...assetProfileDummyData,
            currency: 'USD',
            dataSource: 'YAHOO',
            name: 'Microsoft Inc.',
            symbol: 'MSFT'
          },
          date: new Date('2021-09-16'),
          feeInAssetProfileCurrency: 19,
          feeInBaseCurrency: 19,
          quantity: 1,
          type: 'BUY',
          unitPriceInAssetProfileCurrency: 298.58
        },
        {
          ...activityDummyData,
          assetProfile: {
            ...assetProfileDummyData,
            currency: 'USD',
            dataSource: 'YAHOO',
            name: 'Microsoft Inc.',
            symbol: 'MSFT'
          },
          date: new Date('2021-11-16'),
          feeInAssetProfileCurrency: 0,
          feeInBaseCurrency: 0,
          quantity: 1,
          type: 'DIVIDEND',
          unitPriceInAssetProfileCurrency: 0.62
        },
        {
          // The holding has a dividend, but no average investment. Thus the
          // dividend percentage stays 0, like the dividend yield
          ...activityDummyData,
          assetProfile: {
            ...assetProfileDummyData,
            currency: 'USD',
            dataSource: 'YAHOO',
            name: 'Alphabet Inc.',
            symbol: 'GOOGL'
          },
          date: new Date('2023-07-10'),
          feeInAssetProfileCurrency: 0,
          feeInBaseCurrency: 0,
          quantity: 1,
          type: 'DIVIDEND',
          unitPriceInAssetProfileCurrency: 5
        }
      ];

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.ROAI,
        currency: 'USD',
        usePortfolioSnapshotCache: false,
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

      const performanceByDateRange = await getPerformanceByDateRange({
        portfolioCalculator,
        dateRanges: ['max']
      });

      expect(portfolioSnapshot).toMatchObject({
        dividendYieldPercentWithCurrencyEffect: new Big(0)
      });

      expect(portfolioSnapshot.historicalData.at(-1)).toMatchObject({
        dividendInBaseCurrency: 5.62,
        dividendInPercentageWithCurrencyEffect: 0
      });

      expect(performanceByDateRange).toMatchObject({
        max: {
          dividendInBaseCurrency: 5.62,
          dividendInPercentageWithCurrencyEffect: 0
        }
      });
    });

    it('with MSFT dividend before and in the date range', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2023-07-10').getTime());

      const activities: Activity[] = [
        {
          ...activityDummyData,
          assetProfile: {
            ...assetProfileDummyData,
            currency: 'USD',
            dataSource: 'YAHOO',
            name: 'Microsoft Inc.',
            symbol: 'MSFT'
          },
          date: new Date('2021-09-16'),
          feeInAssetProfileCurrency: 19,
          feeInBaseCurrency: 19,
          quantity: 1,
          type: 'BUY',
          unitPriceInAssetProfileCurrency: 298.58
        },
        {
          ...activityDummyData,
          assetProfile: {
            ...assetProfileDummyData,
            currency: 'USD',
            dataSource: 'YAHOO',
            name: 'Microsoft Inc.',
            symbol: 'MSFT'
          },
          date: new Date('2021-11-16'),
          feeInAssetProfileCurrency: 0,
          feeInBaseCurrency: 0,
          quantity: 1,
          type: 'DIVIDEND',
          unitPriceInAssetProfileCurrency: 0.62
        },
        {
          ...activityDummyData,
          assetProfile: {
            ...assetProfileDummyData,
            currency: 'USD',
            dataSource: 'YAHOO',
            name: 'Microsoft Inc.',
            symbol: 'MSFT'
          },
          date: new Date('2023-07-10'),
          feeInAssetProfileCurrency: 0,
          feeInBaseCurrency: 0,
          quantity: 1,
          type: 'DIVIDEND',
          unitPriceInAssetProfileCurrency: 0.68
        }
      ];

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.ROAI,
        currency: 'USD',
        usePortfolioSnapshotCache: false,
        userId: userDummyData.id
      });

      await portfolioCalculator.computeSnapshot();

      const performanceByDateRange = await getPerformanceByDateRange({
        portfolioCalculator,
        dateRanges: ['1d', 'max', 'ytd']
      });

      // The dividend before the date range is subtracted, so that the date
      // range shows the dividend in the date range only
      expect(performanceByDateRange).toMatchObject({
        '1d': {
          dividendInBaseCurrency: 0.68,
          dividendInPercentageWithCurrencyEffect: 0.002016487752802325
        },
        max: {
          dividendInBaseCurrency: 1.3,
          dividendInPercentageWithCurrencyEffect: 0.004353941992095899
        },
        ytd: {
          dividendInBaseCurrency: 0.68,
          dividendInPercentageWithCurrencyEffect: 0.002002886512915673
        }
      });
    });
  });
});
