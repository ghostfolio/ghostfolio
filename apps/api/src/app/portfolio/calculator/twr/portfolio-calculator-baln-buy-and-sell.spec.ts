import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import {
  activityDummyData,
  symbolProfileDummyData,
  userDummyData
} from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator-test-utils';
import {
  PerformanceCalculationType,
  PortfolioCalculatorFactory
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
    it.only('with BALN.SW buy and sell', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2021-12-18').getTime());

      const activities: Activity[] = [
        {
          ...activityDummyData,
          date: new Date('2021-11-22'),
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
          unitPrice: 142.9
        },
        {
          ...activityDummyData,
          date: new Date('2021-11-30'),
          fee: 1.65,
          quantity: 2,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: 'CHF',
            dataSource: 'YAHOO',
            name: 'Bâloise Holding AG',
            symbol: 'BALN.SW'
          },
          type: 'SELL',
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
        start: parseDate('2021-11-22')
      });

      const portfolioSnapshot = await portfolioCalculator.getSnapshot();

      const investments = portfolioCalculator.getInvestments();

      const investmentsByMonth = portfolioCalculator.getInvestmentsByGroup({
        data: chartData,
        groupBy: 'month'
      });

      expect(portfolioSnapshot).toMatchObject({
        currentValueInBaseCurrency: new Big('0'),
        errors: [],
        grossPerformance: new Big('-12.6'),
        grossPerformancePercentage: new Big('-0.0440867739678096571'),
        grossPerformancePercentageWithCurrencyEffect: new Big(
          '-0.0440867739678096571'
        ),
        grossPerformanceWithCurrencyEffect: new Big('-12.6'),
        hasErrors: false,
        netPerformance: new Big('-15.8'),
        netPerformancePercentage: new Big('-0.0552834149755073478'),
        netPerformancePercentageWithCurrencyEffect: new Big(
          '-0.0552834149755073478'
        ),
        netPerformanceWithCurrencyEffect: new Big('-15.8'),
        positions: [
          {
            averagePrice: new Big('0'),
            currency: 'CHF',
            dataSource: 'YAHOO',
            dividend: new Big('0'),
            dividendInBaseCurrency: new Big('0'),
            fee: new Big('3.2'),
            feeInBaseCurrency: new Big('3.2'),
            firstBuyDate: '2021-11-22',
            grossPerformance: new Big('-12.6'),
            grossPerformancePercentage: new Big('-0.0440867739678096571'),
            grossPerformancePercentageWithCurrencyEffect: new Big(
              '-0.0440867739678096571'
            ),
            grossPerformanceWithCurrencyEffect: new Big('-12.6'),
            investment: new Big('0'),
            investmentWithCurrencyEffect: new Big('0'),
            netPerformance: new Big('-15.8'),
            netPerformancePercentage: new Big('-0.0552834149755073478'),
            netPerformancePercentageWithCurrencyEffect: new Big(
              '-0.0552834149755073478'
            ),
            netPerformanceWithCurrencyEffect: new Big('-15.8'),
            netPerformanceWithCurrencyEffectMap: {
              max: new Big('-15.8')
            },
            marketPrice: 148.9,
            marketPriceInBaseCurrency: 148.9,
            quantity: new Big('0'),
            symbol: 'BALN.SW',
            tags: [],
            timeWeightedInvestment: new Big('285.8'),
            timeWeightedInvestmentWithCurrencyEffect: new Big('285.8'),
            transactionCount: 2,
            valueInBaseCurrency: new Big('0')
          }
        ],
        totalFeesWithCurrencyEffect: new Big('3.2'),
        totalInterestWithCurrencyEffect: new Big('0'),
        totalInvestment: new Big('0'),
        totalInvestmentWithCurrencyEffect: new Big('0'),
        totalLiabilitiesWithCurrencyEffect: new Big('0'),
        totalValuablesWithCurrencyEffect: new Big('0')
      });

      expect(investments).toEqual([
        { date: '2021-11-22', investment: new Big('285.8') },
        { date: '2021-11-30', investment: new Big('0') }
      ]);

      expect(investmentsByMonth).toEqual([
        { date: '2021-11-01', investment: 0 },
        { date: '2021-12-01', investment: 0 }
      ]);
    });
  });
});
