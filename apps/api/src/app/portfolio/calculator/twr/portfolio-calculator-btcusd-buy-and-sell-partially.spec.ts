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
import { ExchangeRateDataServiceMock } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service.mock';
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

jest.mock(
  '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service',
  () => {
    return {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      ExchangeRateDataService: jest.fn().mockImplementation(() => {
        return ExchangeRateDataServiceMock;
      })
    };
  }
);

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
    it.only('with BTCUSD buy and sell partially', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2018-01-01').getTime());

      const activities: Activity[] = [
        {
          ...activityDummyData,
          date: new Date('2015-01-01'),
          fee: 0,
          quantity: 2,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: 'USD',
            dataSource: 'YAHOO',
            name: 'Bitcoin USD',
            symbol: 'BTCUSD'
          },
          type: 'BUY',
          unitPrice: 320.43
        },
        {
          ...activityDummyData,
          date: new Date('2017-12-31'),
          fee: 0,
          quantity: 1,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: 'USD',
            dataSource: 'YAHOO',
            name: 'Bitcoin USD',
            symbol: 'BTCUSD'
          },
          type: 'SELL',
          unitPrice: 14156.4
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
        start: parseDate('2015-01-01')
      });

      const portfolioSnapshot = await portfolioCalculator.getSnapshot();

      const investments = portfolioCalculator.getInvestments();

      const investmentsByMonth = portfolioCalculator.getInvestmentsByGroup({
        data: chartData,
        groupBy: 'month'
      });

      expect(portfolioSnapshot).toMatchObject({
        currentValueInBaseCurrency: new Big('13298.425356'),
        errors: [],
        grossPerformance: new Big('27172.74').mul(0.97373),
        grossPerformancePercentage: new Big('42.41983590271396606847'),
        grossPerformancePercentageWithCurrencyEffect: new Big(
          '41.64017412624815595315'
        ),
        grossPerformanceWithCurrencyEffect: new Big('26516.208701400000064086'),
        hasErrors: false,
        netPerformance: new Big('27172.74').mul(0.97373),
        netPerformancePercentage: new Big('42.41983590271396606847'),
        netPerformancePercentageWithCurrencyEffect: new Big(
          '41.64017412624815595315'
        ),
        netPerformanceWithCurrencyEffect: new Big('26516.208701400000064086'),
        positions: [
          {
            averagePrice: new Big('320.43'),
            currency: 'USD',
            dataSource: 'YAHOO',
            dividend: new Big('0'),
            dividendInBaseCurrency: new Big('0'),
            fee: new Big('0'),
            feeInBaseCurrency: new Big('0'),
            firstBuyDate: '2015-01-01',
            grossPerformance: new Big('27172.74').mul(0.97373),
            grossPerformancePercentage: new Big('42.41983590271396606847'),
            grossPerformancePercentageWithCurrencyEffect: new Big(
              '41.64017412624815595315'
            ),
            grossPerformanceWithCurrencyEffect: new Big(
              '26516.208701400000064086'
            ),
            investment: new Big('320.43').mul(0.97373),
            investmentWithCurrencyEffect: new Big('318.542667299999967957'),
            marketPrice: 13657.2,
            marketPriceInBaseCurrency: 13298.425356,
            netPerformance: new Big('27172.74').mul(0.97373),
            netPerformancePercentage: new Big('42.41983590271396606847'),
            netPerformancePercentageWithCurrencyEffect: new Big(
              '41.64017412624815595315'
            ),
            netPerformanceWithCurrencyEffect: new Big(
              '26516.208701400000064086'
            ),
            quantity: new Big('1'),
            symbol: 'BTCUSD',
            tags: [],
            timeWeightedInvestment: new Big('623.73914366102470303356'),
            timeWeightedInvestmentWithCurrencyEffect: new Big(
              '636.79389574611155572775'
            ),
            transactionCount: 2,
            valueInBaseCurrency: new Big('13298.425356')
          }
        ],
        totalFeesWithCurrencyEffect: new Big('0'),
        totalInterestWithCurrencyEffect: new Big('0'),
        totalInvestment: new Big('320.43').mul(0.97373),
        totalInvestmentWithCurrencyEffect: new Big('318.542667299999967957'),
        totalLiabilitiesWithCurrencyEffect: new Big('0'),
        totalValuablesWithCurrencyEffect: new Big('0')
      });

      expect(investments).toEqual([
        { date: '2015-01-01', investment: new Big('640.86') },
        { date: '2017-12-31', investment: new Big('320.43') }
      ]);

      expect(investmentsByMonth).toEqual([
        { date: '2015-01-01', investment: 637.0853345999999 },
        { date: '2015-02-01', investment: 0 },
        { date: '2015-03-01', investment: 0 },
        { date: '2015-04-01', investment: 0 },
        { date: '2015-05-01', investment: 0 },
        { date: '2015-06-01', investment: 0 },
        { date: '2015-07-01', investment: 0 },
        { date: '2015-08-01', investment: 0 },
        { date: '2015-09-01', investment: 0 },
        { date: '2015-10-01', investment: 0 },
        { date: '2015-11-01', investment: 0 },
        { date: '2015-12-01', investment: 0 },
        { date: '2016-01-01', investment: 0 },
        { date: '2016-02-01', investment: 0 },
        { date: '2016-03-01', investment: 0 },
        { date: '2016-04-01', investment: 0 },
        { date: '2016-05-01', investment: 0 },
        { date: '2016-06-01', investment: 0 },
        { date: '2016-07-01', investment: 0 },
        { date: '2016-08-01', investment: 0 },
        { date: '2016-09-01', investment: 0 },
        { date: '2016-10-01', investment: 0 },
        { date: '2016-11-01', investment: 0 },
        { date: '2016-12-01', investment: 0 },
        { date: '2017-01-01', investment: 0 },
        { date: '2017-02-01', investment: 0 },
        { date: '2017-03-01', investment: 0 },
        { date: '2017-04-01', investment: 0 },
        { date: '2017-05-01', investment: 0 },
        { date: '2017-06-01', investment: 0 },
        { date: '2017-07-01', investment: 0 },
        { date: '2017-08-01', investment: 0 },
        { date: '2017-09-01', investment: 0 },
        { date: '2017-10-01', investment: 0 },
        { date: '2017-11-01', investment: 0 },
        { date: '2017-12-01', investment: -318.54266729999995 },
        { date: '2018-01-01', investment: 0 }
      ]);
    });
  });
});
