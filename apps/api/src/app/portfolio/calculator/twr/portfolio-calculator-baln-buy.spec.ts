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

  describe('get current positions', () => {
    it.only('with BALN.SW buy', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2021-12-18').getTime());

      const activities: Activity[] = [
        {
          ...activityDummyData,
          date: new Date('2021-11-30'),
          fee: 1.55,
          quantity: 2,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: 'CHF',
            dataSource: 'YAHOO',
            name: 'Bâloise Holding AG',
            symbol: 'BALN.SW'
          },
          type: 'BUY',
          unitPrice: 136.6
        }
      ];

      const portfolioCalculator = factory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.TWR,
        currency: 'CHF',
        hasFilters: false,
        userId: userDummyData.id
      });

      const chartData = await portfolioCalculator.getChartData({
        start: parseDate('2021-11-30')
      });

      const portfolioSnapshot = await portfolioCalculator.getSnapshot();

      const investments = portfolioCalculator.getInvestments();

      const investmentsByMonth = portfolioCalculator.getInvestmentsByGroup({
        data: chartData,
        groupBy: 'month'
      });

      expect(portfolioSnapshot).toMatchObject({
        currentValueInBaseCurrency: new Big('297.8'),
        errors: [],
        grossPerformance: new Big('24.6'),
        grossPerformancePercentage: new Big('0.09004392386530014641'),
        grossPerformancePercentageWithCurrencyEffect: new Big(
          '0.09004392386530014641'
        ),
        grossPerformanceWithCurrencyEffect: new Big('24.6'),
        hasErrors: false,
        netPerformance: new Big('23.05'),
        netPerformancePercentage: new Big('0.08437042459736456808'),
        netPerformancePercentageWithCurrencyEffect: new Big(
          '0.08437042459736456808'
        ),
        netPerformanceWithCurrencyEffect: new Big('23.05'),
        positions: [
          {
            averagePrice: new Big('136.6'),
            currency: 'CHF',
            dataSource: 'YAHOO',
            dividend: new Big('0'),
            dividendInBaseCurrency: new Big('0'),
            fee: new Big('1.55'),
            feeInBaseCurrency: new Big('1.55'),
            firstBuyDate: '2021-11-30',
            grossPerformance: new Big('24.6'),
            grossPerformancePercentage: new Big('0.09004392386530014641'),
            grossPerformancePercentageWithCurrencyEffect: new Big(
              '0.09004392386530014641'
            ),
            grossPerformanceWithCurrencyEffect: new Big('24.6'),
            investment: new Big('273.2'),
            investmentWithCurrencyEffect: new Big('273.2'),
            netPerformance: new Big('23.05'),
            netPerformancePercentage: new Big('0.08437042459736456808'),
            netPerformancePercentageWithCurrencyEffect: new Big(
              '0.08437042459736456808'
            ),
            netPerformanceWithCurrencyEffect: new Big('23.05'),
            netPerformanceWithCurrencyEffectMap: {
              max: new Big('23.05')
            },
            marketPrice: 148.9,
            marketPriceInBaseCurrency: 148.9,
            quantity: new Big('2'),
            symbol: 'BALN.SW',
            tags: [],
            timeWeightedInvestment: new Big('273.2'),
            timeWeightedInvestmentWithCurrencyEffect: new Big('273.2'),
            transactionCount: 1,
            valueInBaseCurrency: new Big('297.8')
          }
        ],
        totalFeesWithCurrencyEffect: new Big('1.55'),
        totalInterestWithCurrencyEffect: new Big('0'),
        totalInvestment: new Big('273.2'),
        totalInvestmentWithCurrencyEffect: new Big('273.2'),
        totalLiabilitiesWithCurrencyEffect: new Big('0'),
        totalValuablesWithCurrencyEffect: new Big('0')
      });

      expect(investments).toEqual([
        { date: '2021-11-30', investment: new Big('273.2') }
      ]);

      expect(investmentsByMonth).toEqual([
        { date: '2021-11-01', investment: 273.2 },
        { date: '2021-12-01', investment: 0 }
      ]);
    });
  });
});
