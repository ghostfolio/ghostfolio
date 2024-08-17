import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import {
  activityDummyData,
  symbolProfileDummyData,
  userDummyData
} from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator-test-utils';
import {
  PortfolioCalculatorFactory,
  PerformanceCalculationType
} from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator.factory';
import { CurrentRateService } from '@ghostfolio/api/app/portfolio/current-rate.service';
import { CurrentRateServiceMock } from '@ghostfolio/api/app/portfolio/current-rate.service.mock';
import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { RedisCacheServiceMock } from '@ghostfolio/api/app/redis-cache/redis-cache.service.mock';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { parseDate } from '@ghostfolio/common/helper';

import { Big } from 'big.js';

jest.mock('@ghostfolio/api/app/portfolio/current-rate.service', () => {
  return {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    CurrentRateService: jest.fn().mockImplementation(() => {
      return CurrentRateServiceMock;
    })
  };
});

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
  let factory: PortfolioCalculatorFactory;
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

    redisCacheService = new RedisCacheService(null, null);

    factory = new PortfolioCalculatorFactory(
      configurationService,
      currentRateService,
      exchangeRateDataService,
      redisCacheService
    );
  });

  describe('compute portfolio snapshot', () => {
    it.only('with fee activity', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2021-12-18').getTime());

      const activities: Activity[] = [
        {
          ...activityDummyData,
          date: new Date('2021-09-01'),
          fee: 49,
          quantity: 0,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: 'USD',
            dataSource: 'MANUAL',
            name: 'Account Opening Fee',
            symbol: '2c463fb3-af07-486e-adb0-8301b3d72141'
          },
          type: 'FEE',
          unitPrice: 0
        }
      ];

      const portfolioCalculator = factory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.TWR,
        currency: 'USD',
        hasFilters: false,
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.getSnapshot();

      expect(portfolioSnapshot).toMatchObject({
        currentValueInBaseCurrency: new Big('0'),
        errors: [],
        grossPerformance: new Big('0'),
        grossPerformancePercentage: new Big('0'),
        grossPerformancePercentageWithCurrencyEffect: new Big('0'),
        grossPerformanceWithCurrencyEffect: new Big('0'),
        hasErrors: true,
        netPerformance: new Big('0'),
        netPerformancePercentage: new Big('0'),
        netPerformancePercentageWithCurrencyEffect: new Big('0'),
        netPerformanceWithCurrencyEffect: new Big('0'),
        positions: [
          {
            averagePrice: new Big('0'),
            currency: 'USD',
            dataSource: 'MANUAL',
            dividend: new Big('0'),
            dividendInBaseCurrency: new Big('0'),
            fee: new Big('49'),
            feeInBaseCurrency: new Big('49'),
            firstBuyDate: '2021-09-01',
            grossPerformance: null,
            grossPerformancePercentage: null,
            grossPerformancePercentageWithCurrencyEffect: null,
            grossPerformanceWithCurrencyEffect: null,
            investment: new Big('0'),
            investmentWithCurrencyEffect: new Big('0'),
            marketPrice: null,
            marketPriceInBaseCurrency: 0,
            netPerformance: null,
            netPerformancePercentage: null,
            netPerformancePercentageWithCurrencyEffect: null,
            netPerformanceWithCurrencyEffect: null,
            netPerformanceWithCurrencyEffectMap: null,
            quantity: new Big('0'),
            symbol: '2c463fb3-af07-486e-adb0-8301b3d72141',
            tags: [],
            timeWeightedInvestment: new Big('0'),
            timeWeightedInvestmentWithCurrencyEffect: new Big('0'),
            transactionCount: 1,
            valueInBaseCurrency: new Big('0')
          }
        ],
        totalFeesWithCurrencyEffect: new Big('49'),
        totalInterestWithCurrencyEffect: new Big('0'),
        totalInvestment: new Big('0'),
        totalInvestmentWithCurrencyEffect: new Big('0'),
        totalLiabilitiesWithCurrencyEffect: new Big('0'),
        totalValuablesWithCurrencyEffect: new Big('0')
      });
    });
  });
});
