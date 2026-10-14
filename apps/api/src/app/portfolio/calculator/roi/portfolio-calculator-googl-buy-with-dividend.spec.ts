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
import { ExchangeRateDataServiceMock } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service.mock';
import { PortfolioSnapshotService } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service';
import { PortfolioSnapshotServiceMock } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service.mock';
import { getAnnualizedPerformancePercent } from '@ghostfolio/common/calculation-helper';
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

describe('RoiPortfolioCalculator', () => {
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

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('get current positions', () => {
    it('with GOOGL buy and dividend', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2023-07-10').getTime());

      const activities: Activity[] = [
        {
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
          feeInBaseCurrency: 0.9238,
          quantity: 1,
          type: 'BUY',
          unitPriceInAssetProfileCurrency: 89.12
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
          date: new Date('2023-01-03'),
          feeInAssetProfileCurrency: 0,
          feeInBaseCurrency: 0,
          quantity: 1,
          type: 'DIVIDEND',
          unitPriceInAssetProfileCurrency: 5
        }
      ];

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.ROI,
        currency: 'CHF',
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

      // The buy is valued at the current exchange rate (0.8854) and with the
      // currency effect at the exchange rate of the buy date (0.9238)
      expect(portfolioSnapshot.positions).toMatchObject([
        {
          netPerformancePercentage: new Big('31.33')
            .mul(0.8854)
            .div(new Big('89.12').mul(0.8854)),
          netPerformancePercentageWithCurrencyEffectMap: {
            max: new Big('24.470974').div(new Big('89.12').mul(0.9238))
          }
        }
      ]);

      expect(portfolioSnapshot.historicalData.at(-1)).toMatchObject({
        dividendInPercentageWithCurrencyEffect: new Big('4.619')
          .div(new Big('89.12').mul(0.9238))
          .toNumber(),
        totalBuyValue: new Big('89.12').mul(0.8854).toNumber(),
        totalBuyValueWithCurrencyEffect: new Big('89.12').mul(0.9238).toNumber()
      });

      // 188 days between the first activity (2023-01-03) and today (2023-07-10)
      expect(portfolioSnapshot.dividendYieldPercentWithCurrencyEffect).toEqual(
        getAnnualizedPerformancePercent({
          daysInMarket: 188,
          netPerformancePercentage: new Big('4.619').div(
            new Big('89.12').mul(0.9238)
          )
        })
      );
    });
  });
});
