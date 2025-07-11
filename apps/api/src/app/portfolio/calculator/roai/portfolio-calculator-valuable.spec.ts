import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
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
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

import { Big } from 'big.js';

jest.mock('@ghostfolio/api/app/portfolio/current-rate.service', () => {
  return {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    CurrentRateService: jest.fn().mockImplementation(() => {
      return CurrentRateServiceMock;
    })
  };
});

jest.mock(
  '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service',
  () => {
    return {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      PortfolioSnapshotService: jest.fn().mockImplementation(() => {
        return PortfolioSnapshotServiceMock;
      })
    };
  }
);

jest.mock('@ghostfolio/api/app/redis-cache/redis-cache.service', () => {
  return {
    // eslint-disable-next-line @typescript-eslint/naming-convention
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

  describe('compute portfolio snapshot', () => {
    it.only('with valuable activity', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2022-01-31').getTime());

      const activities: Activity[] = [
        {
          ...activityDummyData,
          date: new Date('2022-01-01'),
          feeInAssetProfileCurrency: 0,
          quantity: 1,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: 'USD',
            dataSource: 'MANUAL',
            name: 'Penthouse Apartment',
            symbol: 'dac95060-d4f2-4653-a253-2c45e6fb5cde'
          },
          type: 'BUY',
          unitPriceInAssetProfileCurrency: 500000
        }
      ];

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.ROAI,
        currency: 'USD',
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

      expect(portfolioSnapshot).toMatchObject({
        currentValueInBaseCurrency: new Big('500000'),
        errors: [],
        hasErrors: false,
        positions: [
          {
            averagePrice: new Big('500000'),
            currency: 'USD',
            dataSource: 'MANUAL',
            dividend: new Big('0'),
            dividendInBaseCurrency: new Big('0'),
            fee: new Big('0'),
            feeInBaseCurrency: new Big('0'),
            firstBuyDate: '2022-01-01',
            grossPerformance: new Big('0'),
            grossPerformancePercentage: new Big('0'),
            grossPerformancePercentageWithCurrencyEffect: new Big('0'),
            grossPerformanceWithCurrencyEffect: new Big('0'),
            investment: new Big('500000'),
            investmentWithCurrencyEffect: new Big('500000'),
            marketPrice: null,
            marketPriceInBaseCurrency: 500000,
            netPerformance: new Big('0'),
            netPerformancePercentage: new Big('0'),
            netPerformancePercentageWithCurrencyEffectMap: {
              max: new Big('0')
            },
            netPerformanceWithCurrencyEffectMap: {
              max: new Big('0')
            },
            quantity: new Big('1'),
            symbol: 'dac95060-d4f2-4653-a253-2c45e6fb5cde',
            tags: [],
            timeWeightedInvestment: new Big('500000'),
            timeWeightedInvestmentWithCurrencyEffect: new Big('500000'),
            transactionCount: 1,
            valueInBaseCurrency: new Big('500000')
          }
        ],
        totalFeesWithCurrencyEffect: new Big('0'),
        totalInterestWithCurrencyEffect: new Big('0'),
        totalInvestment: new Big('500000'),
        totalInvestmentWithCurrencyEffect: new Big('500000'),
        totalLiabilitiesWithCurrencyEffect: new Big('0')
      });

      expect(portfolioSnapshot.historicalData.at(-1)).toMatchObject(
        expect.objectContaining({
          netPerformance: 0,
          netPerformanceInPercentage: 0,
          netPerformanceInPercentageWithCurrencyEffect: 0,
          netPerformanceWithCurrencyEffect: 0,
          totalInvestmentValueWithCurrencyEffect: 500000
        })
      );
    });
  });
});
