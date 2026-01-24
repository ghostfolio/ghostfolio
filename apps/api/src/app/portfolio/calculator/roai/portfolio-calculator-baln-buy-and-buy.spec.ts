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
    it.only('with BALN.SW buy and buy', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2021-12-18').getTime());

      const activities: Activity[] = [
        {
          ...activityDummyData,
          date: new Date('2021-11-22'),
          feeInAssetProfileCurrency: 1.55,
          feeInBaseCurrency: 1.55,
          quantity: 2,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: 'CHF',
            dataSource: 'YAHOO',
            name: 'Bâloise Holding AG',
            symbol: 'BALN.SW'
          },
          type: 'BUY',
          unitPriceInAssetProfileCurrency: 142.9
        },
        {
          ...activityDummyData,
          date: new Date('2021-11-30'),
          feeInAssetProfileCurrency: 1.65,
          feeInBaseCurrency: 1.65,
          quantity: 2,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: 'CHF',
            dataSource: 'YAHOO',
            name: 'Bâloise Holding AG',
            symbol: 'BALN.SW'
          },
          type: 'BUY',
          unitPriceInAssetProfileCurrency: 136.6
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

      const investmentsByYear = portfolioCalculator.getInvestmentsByGroup({
        data: portfolioSnapshot.historicalData,
        groupBy: 'year'
      });

      expect(portfolioSnapshot).toMatchObject({
        currentValueInBaseCurrency: new Big('595.6'),
        errors: [],
        hasErrors: false,
        positions: [
          {
            activitiesCount: 2,
            averagePrice: new Big('139.75'),
            currency: 'CHF',
            dataSource: 'YAHOO',
            dateOfFirstActivity: '2021-11-22',
            dividend: new Big('0'),
            dividendInBaseCurrency: new Big('0'),
            fee: new Big('3.2'),
            feeInBaseCurrency: new Big('3.2'),
            grossPerformance: new Big('36.6'),
            grossPerformancePercentage: new Big('0.07706261539956593567'),
            grossPerformancePercentageWithCurrencyEffect: new Big(
              '0.07706261539956593567'
            ),
            grossPerformanceWithCurrencyEffect: new Big('36.6'),
            investment: new Big('559'),
            investmentWithCurrencyEffect: new Big('559'),
            netPerformance: new Big('33.4'),
            netPerformancePercentage: new Big('0.07032490039195361342'),
            netPerformancePercentageWithCurrencyEffectMap: {
              max: new Big('0.06986689805847808234')
            },
            netPerformanceWithCurrencyEffectMap: {
              max: new Big('33.4')
            },
            marketPrice: 148.9,
            marketPriceInBaseCurrency: 148.9,
            quantity: new Big('4'),
            symbol: 'BALN.SW',
            tags: [],
            timeWeightedInvestment: new Big('474.93846153846153846154'),
            timeWeightedInvestmentWithCurrencyEffect: new Big(
              '474.93846153846153846154'
            ),
            transactionCount: 2,
            valueInBaseCurrency: new Big('595.6')
          }
        ],
        totalFeesWithCurrencyEffect: new Big('3.2'),
        totalInterestWithCurrencyEffect: new Big('0'),
        totalInvestment: new Big('559'),
        totalInvestmentWithCurrencyEffect: new Big('559'),
        totalLiabilitiesWithCurrencyEffect: new Big('0')
      });

      expect(portfolioSnapshot.historicalData.at(-1)).toMatchObject(
        expect.objectContaining({
          netPerformance: 33.4,
          netPerformanceInPercentage: 0.07032490039195362,
          netPerformanceInPercentageWithCurrencyEffect: 0.07032490039195362,
          netPerformanceWithCurrencyEffect: 33.4,
          totalInvestmentValueWithCurrencyEffect: 559
        })
      );

      expect(investments).toEqual([
        { date: '2021-11-22', investment: new Big('285.8') },
        { date: '2021-11-30', investment: new Big('559') }
      ]);

      expect(investmentsByMonth).toEqual([
        { date: '2021-11-01', investment: 559 },
        { date: '2021-12-01', investment: 0 }
      ]);

      expect(investmentsByYear).toEqual([
        { date: '2021-01-01', investment: 559 }
      ]);
    });
  });
});
