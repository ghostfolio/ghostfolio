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
import { PortfolioSnapshotService } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service';
import { PortfolioSnapshotServiceMock } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service.mock';
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

  describe('get current positions', () => {
    it.only('with multiple BALN.SW buys', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2021-12-18').getTime());

      const activities: Activity[] = [
        {
          ...activityDummyData,
          date: new Date('2021-11-30'),
          fee: 0,
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
        },
        {
          ...activityDummyData,
          date: new Date('2021-12-05'),
          fee: 0,
          quantity: 1,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: 'CHF',
            dataSource: 'YAHOO',
            name: 'Bâloise Holding AG',
            symbol: 'BALN.SW'
          },
          type: 'BUY',
          unitPrice: 140.0
        },
        {
          ...activityDummyData,
          date: new Date('2021-12-10'),
          fee: 0,
          quantity: 3,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: 'CHF',
            dataSource: 'YAHOO',
            name: 'Bâloise Holding AG',
            symbol: 'BALN.SW'
          },
          type: 'BUY',
          unitPrice: 145.0
        }
      ];

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.ROAI,
        currency: 'CHF',
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

      const investments = portfolioCalculator.getInvestments();

      const investmentsByMonth = portfolioCalculator.getInvestmentsByGroup({
        data: portfolioSnapshot.historicalData,
        groupBy: 'month'
      });

      expect(portfolioSnapshot).toMatchObject({
        currentValueInBaseCurrency: new Big('893.4'), // 6 * 148.9 (current market price)
        errors: [],
        hasErrors: false,
        positions: [
          {
            averagePrice: new Big('141.36666666666666666667'), // Weighted average price
            currency: 'CHF',
            dataSource: 'YAHOO',
            dividend: new Big('0'),
            dividendInBaseCurrency: new Big('0'),
            fee: new Big('0'), // Total fees
            feeInBaseCurrency: new Big('0'),
            firstBuyDate: '2021-11-30',
            grossPerformance: new Big('45.2'), // (148.9 - 141.36666666666666666666666666667) * 6
            grossPerformancePercentage: new Big('0.05328931855694411695354869134638'),
            grossPerformancePercentageWithCurrencyEffect: new Big('0.05328931855694411695354869134638'),
            grossPerformanceWithCurrencyEffect: new Big('45.2'),
            investment: new Big('848.2'), // Total investment
            investmentWithCurrencyEffect: new Big('848.2'),
            netPerformance: new Big('45.2'), // Gross performance - fees
            netPerformancePercentage: new Big('0.05328931855694411695354869134638'),
            netPerformancePercentageWithCurrencyEffectMap: {
              max: new Big('0.05328931855694411695354869134638')
            },
            netPerformanceWithCurrencyEffectMap: {
              max: new Big('45.2')
            },
            marketPrice: 148.9,
            marketPriceInBaseCurrency: 148.9,
            quantity: new Big('6'),
            symbol: 'BALN.SW',
            tags: [],
            timeWeightedInvestment: new Big('848.2'),
            timeWeightedInvestmentWithCurrencyEffect: new Big('848.2'),
            transactionCount: 3,
            valueInBaseCurrency: new Big('893.4') // 6 * 148.9
          }
        ],
        totalFeesWithCurrencyEffect: new Big('0'),
        totalInterestWithCurrencyEffect: new Big('0'),
        totalInvestment: new Big('848.2'),
        totalInvestmentWithCurrencyEffect: new Big('848.2'),
        totalLiabilitiesWithCurrencyEffect: new Big('0'),
        totalValuablesWithCurrencyEffect: new Big('0')
      });

      expect(portfolioSnapshot.historicalData.at(-1)).toMatchObject(
        expect.objectContaining({
          netPerformance: 45.2,
          netPerformanceInPercentage: 0.05328931855694411695354869134638,
          netPerformanceInPercentageWithCurrencyEffect: 0.05328931855694411695354869134638,
          netPerformanceWithCurrencyEffect: 45.2,
          totalInvestmentValueWithCurrencyEffect: 893.4
        })
      );

      expect(investments).toEqual([
        { date: '2021-11-30', investment: new Big('273.7') }, // (136.6 * 2) + 1.55
        { date: '2021-12-05', investment: new Big('141.2') }, // (140.0 * 1) + 1.2
        { date: '2021-12-10', investment: new Big('431.4') } // (145.0 * 3) + 1.0
      ]);

      expect(investmentsByMonth).toEqual([
        { date: '2021-11-01', investment: 273.7 },
        { date: '2021-12-01', investment: 572.6 }
      ]);
    });
  });
});
