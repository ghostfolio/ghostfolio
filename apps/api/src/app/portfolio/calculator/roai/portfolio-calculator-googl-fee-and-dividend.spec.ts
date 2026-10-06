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
          // holdings of the portfolio summary. But its fee and its dividend are
          // part of the net performance, and thus its dividend is part of the
          // dividend of the chart
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

      const performanceByDateRange = await getPerformanceByDateRange({
        portfolioCalculator,
        dateRanges: ['max']
      });

      expect(
        portfolioSnapshot.positions.map(({ symbol }) => {
          return symbol;
        })
      ).toEqual(['MSFT']);

      expect(portfolioSnapshot.historicalData.at(-1)).toMatchObject({
        dividendInBaseCurrency: 5.62,
        dividendInPercentageWithCurrencyEffect: 0.01882242615044544,
        netPerformance: 18.87,
        netPerformanceInPercentage: 0.06319914260834618
      });

      // The portfolio summary takes the dividend of the date range max
      expect(performanceByDateRange).toMatchObject({
        max: {
          dividendInBaseCurrency: 5.62,
          dividendInPercentageWithCurrencyEffect: 0.01882242615044543,
          netPerformance: 18.87,
          netPerformanceInPercentage: 0.06319914260834614
        }
      });
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
          // The holding has a dividend, but no average investment. Its dividend
          // is part of the net performance, and thus of the dividend percentage
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
        dividendInPercentageWithCurrencyEffect: 0.01882242615044544,
        netPerformance: 19.87,
        netPerformanceInPercentage: 0.06654832875611226
      });

      expect(performanceByDateRange).toMatchObject({
        max: {
          dividendInBaseCurrency: 5.62,
          dividendInPercentageWithCurrencyEffect: 0.01882242615044543,
          netPerformance: 19.87,
          netPerformanceInPercentage: 0.06654832875611222
        }
      });
    });

    it('with dividend of a holding without market price', async () => {
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
          // The holding has no market price, thus it has no value. Its dividend
          // is not part of the net performance (unlike the dividend in the
          // scenario above), and thus not part of the dividend of the chart
          ...activityDummyData,
          assetProfile: {
            ...assetProfileDummyData,
            currency: 'USD',
            dataSource: 'MANUAL',
            name: 'Private Equity Fund',
            symbol: '3b5ba4a5-4c8e-4bd5-9b4c-5e0d5e7cfc3f'
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

      expect(portfolioSnapshot.hasErrors).toBe(false);

      expect(portfolioSnapshot.historicalData.at(-1)).toMatchObject({
        dividendInBaseCurrency: 0.62,
        dividendInPercentageWithCurrencyEffect: 0.0020764954116149776,
        netPerformance: 14.87,
        netPerformanceInPercentage: 0.0498023980172818
      });

      expect(performanceByDateRange).toMatchObject({
        max: {
          dividendInBaseCurrency: 0.62,
          dividendInPercentageWithCurrencyEffect: 0.002076495411614976,
          netPerformance: 14.87,
          netPerformanceInPercentage: 0.049802398017281764
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
          dividendInPercentageWithCurrencyEffect: 0.004353941992095918
        },
        ytd: {
          dividendInBaseCurrency: 0.68,
          dividendInPercentageWithCurrencyEffect: 0.002002886512915671
        }
      });
    });
  });
});
