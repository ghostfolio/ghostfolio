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
    it('with MSFT buy', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2023-07-10').getTime());

      const activities: Activity[] = [
        {
          ...activityDummyData,
          date: new Date('2021-09-16'),
          feeInAssetProfileCurrency: 19,
          feeInBaseCurrency: 19,
          quantity: 1,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: 'USD',
            dataSource: 'YAHOO',
            name: 'Microsoft Inc.',
            symbol: 'MSFT'
          },
          type: 'BUY',
          unitPriceInAssetProfileCurrency: 298.58
        },
        {
          ...activityDummyData,
          date: new Date('2021-11-16'),
          feeInAssetProfileCurrency: 0,
          feeInBaseCurrency: 0,
          quantity: 1,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: 'USD',
            dataSource: 'YAHOO',
            name: 'Microsoft Inc.',
            symbol: 'MSFT'
          },
          type: 'DIVIDEND',
          unitPriceInAssetProfileCurrency: 0.62
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
        errors: [],
        hasErrors: false,
        positions: [
          {
            activitiesCount: 2,
            averagePrice: new Big('298.58'),
            currency: 'USD',
            dataSource: 'YAHOO',
            dateOfFirstActivity: '2021-09-16',
            dividend: new Big('0.62'),
            dividendInBaseCurrency: new Big('0.62'),
            fee: new Big('19'),
            grossPerformance: new Big('33.25'),
            grossPerformancePercentage: new Big('0.11136043941322258691'),
            grossPerformancePercentageWithCurrencyEffect: new Big(
              '0.11136043941322258691'
            ),
            grossPerformanceWithCurrencyEffect: new Big('33.25'),
            investment: new Big('298.58'),
            investmentWithCurrencyEffect: new Big('298.58'),
            marketPrice: 331.83,
            marketPriceInBaseCurrency: 331.83,
            netPerformance: new Big('14.25'),
            netPerformancePercentage: new Big('0.04772590260566682296'),
            netPerformancePercentageWithCurrencyEffectMap: {
              max: new Big('0.04772590260566682296')
            },
            netPerformanceWithCurrencyEffectMap: {
              '1d': new Big('-5.39'),
              '5y': new Big('14.25'),
              max: new Big('14.25'),
              wtd: new Big('-5.39')
            },
            quantity: new Big('1'),
            symbol: 'MSFT',
            tags: []
          }
        ],
        totalFeesWithCurrencyEffect: new Big('19'),
        totalInterestWithCurrencyEffect: new Big('0'),
        totalInvestment: new Big('298.58'),
        totalInvestmentWithCurrencyEffect: new Big('298.58'),
        totalLiabilitiesWithCurrencyEffect: new Big('0')
      });

      expect(portfolioSnapshot.historicalData.at(-1)).toMatchObject(
        expect.objectContaining({
          totalInvestment: 298.58,
          totalInvestmentValueWithCurrencyEffect: 298.58
        })
      );
    });

    it('with MSFT buy and four quarterly dividends to calculate annualized dividend yield', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2023-07-10').getTime());

      const activities: Activity[] = [
        {
          ...activityDummyData,
          date: new Date('2021-09-16'),
          feeInAssetProfileCurrency: 19,
          feeInBaseCurrency: 19,
          quantity: 1,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: 'USD',
            dataSource: 'YAHOO',
            name: 'Microsoft Inc.',
            symbol: 'MSFT'
          },
          type: 'BUY',
          unitPriceInAssetProfileCurrency: 298.58
        },
        {
          ...activityDummyData,
          date: new Date('2022-08-16'),
          feeInAssetProfileCurrency: 0,
          feeInBaseCurrency: 0,
          quantity: 1,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: 'USD',
            dataSource: 'YAHOO',
            name: 'Microsoft Inc.',
            symbol: 'MSFT'
          },
          type: 'DIVIDEND',
          unitPriceInAssetProfileCurrency: 0.62
        },
        {
          ...activityDummyData,
          date: new Date('2022-11-16'),
          feeInAssetProfileCurrency: 0,
          feeInBaseCurrency: 0,
          quantity: 1,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: 'USD',
            dataSource: 'YAHOO',
            name: 'Microsoft Inc.',
            symbol: 'MSFT'
          },
          type: 'DIVIDEND',
          unitPriceInAssetProfileCurrency: 0.68
        },
        {
          ...activityDummyData,
          date: new Date('2023-02-16'),
          feeInAssetProfileCurrency: 0,
          feeInBaseCurrency: 0,
          quantity: 1,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: 'USD',
            dataSource: 'YAHOO',
            name: 'Microsoft Inc.',
            symbol: 'MSFT'
          },
          type: 'DIVIDEND',
          unitPriceInAssetProfileCurrency: 0.68
        },
        {
          ...activityDummyData,
          date: new Date('2023-05-16'),
          feeInAssetProfileCurrency: 0,
          feeInBaseCurrency: 0,
          quantity: 1,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: 'USD',
            dataSource: 'YAHOO',
            name: 'Microsoft Inc.',
            symbol: 'MSFT'
          },
          type: 'DIVIDEND',
          unitPriceInAssetProfileCurrency: 0.68
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
        errors: [],
        hasErrors: false,
        positions: [
          {
            activitiesCount: 5,
            averagePrice: new Big('298.58'),
            currency: 'USD',
            dataSource: 'YAHOO',
            dateOfFirstActivity: '2021-09-16',
            dividend: new Big('2.66'),
            dividendInBaseCurrency: new Big('2.66'),
            fee: new Big('19'),
            firstBuyDate: '2021-09-16',
            quantity: new Big('1'),
            symbol: 'MSFT',
            tags: [],
            transactionCount: 5
          }
        ]
      });

      const position = portfolioSnapshot.positions[0];
      expect(position).toHaveProperty('annualizedDividendYield');
      expect(position.annualizedDividendYield).toBeGreaterThan(0);

      // Verify that the snapshot data is sufficient for portfolio summary calculation
      // Portfolio summary annualized dividend yield = totalDividend / totalInvestment
      const expectedPortfolioYield = new Big(position.dividendInBaseCurrency)
        .div(position.investmentWithCurrencyEffect)
        .toNumber();

      expect(position.annualizedDividendYield).toBeCloseTo(
        expectedPortfolioYield,
        10
      );
      expect(expectedPortfolioYield).toBeCloseTo(0.00891, 3); // ~0.89% yield on cost
    });

    it('with MSFT and IBM positions to verify portfolio-wide dividend yield aggregation', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2023-07-10').getTime());

      const activities: Activity[] = [
        // MSFT: 1 share @ 300, 4 quarterly dividends = 2.60 total
        {
          ...activityDummyData,
          date: new Date('2021-09-16'),
          feeInAssetProfileCurrency: 0,
          feeInBaseCurrency: 0,
          quantity: 1,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: 'USD',
            dataSource: 'YAHOO',
            name: 'Microsoft Inc.',
            symbol: 'MSFT'
          },
          type: 'BUY',
          unitPriceInAssetProfileCurrency: 300
        },
        {
          ...activityDummyData,
          date: new Date('2022-08-16'),
          feeInAssetProfileCurrency: 0,
          feeInBaseCurrency: 0,
          quantity: 1,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: 'USD',
            dataSource: 'YAHOO',
            name: 'Microsoft Inc.',
            symbol: 'MSFT'
          },
          type: 'DIVIDEND',
          unitPriceInAssetProfileCurrency: 0.65
        },
        {
          ...activityDummyData,
          date: new Date('2022-11-16'),
          feeInAssetProfileCurrency: 0,
          feeInBaseCurrency: 0,
          quantity: 1,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: 'USD',
            dataSource: 'YAHOO',
            name: 'Microsoft Inc.',
            symbol: 'MSFT'
          },
          type: 'DIVIDEND',
          unitPriceInAssetProfileCurrency: 0.65
        },
        {
          ...activityDummyData,
          date: new Date('2023-02-16'),
          feeInAssetProfileCurrency: 0,
          feeInBaseCurrency: 0,
          quantity: 1,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: 'USD',
            dataSource: 'YAHOO',
            name: 'Microsoft Inc.',
            symbol: 'MSFT'
          },
          type: 'DIVIDEND',
          unitPriceInAssetProfileCurrency: 0.65
        },
        {
          ...activityDummyData,
          date: new Date('2023-05-16'),
          feeInAssetProfileCurrency: 0,
          feeInBaseCurrency: 0,
          quantity: 1,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: 'USD',
            dataSource: 'YAHOO',
            name: 'Microsoft Inc.',
            symbol: 'MSFT'
          },
          type: 'DIVIDEND',
          unitPriceInAssetProfileCurrency: 0.65
        },
        // IBM: 1 share @ 200, 4 quarterly dividends = 6.60 total
        {
          ...activityDummyData,
          date: new Date('2021-10-01'),
          feeInAssetProfileCurrency: 0,
          feeInBaseCurrency: 0,
          quantity: 1,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: 'USD',
            dataSource: 'YAHOO',
            name: 'IBM',
            symbol: 'IBM'
          },
          type: 'BUY',
          unitPriceInAssetProfileCurrency: 200
        },
        {
          ...activityDummyData,
          date: new Date('2022-09-01'),
          feeInAssetProfileCurrency: 0,
          feeInBaseCurrency: 0,
          quantity: 1,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: 'USD',
            dataSource: 'YAHOO',
            name: 'IBM',
            symbol: 'IBM'
          },
          type: 'DIVIDEND',
          unitPriceInAssetProfileCurrency: 1.65
        },
        {
          ...activityDummyData,
          date: new Date('2022-12-01'),
          feeInAssetProfileCurrency: 0,
          feeInBaseCurrency: 0,
          quantity: 1,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: 'USD',
            dataSource: 'YAHOO',
            name: 'IBM',
            symbol: 'IBM'
          },
          type: 'DIVIDEND',
          unitPriceInAssetProfileCurrency: 1.65
        },
        {
          ...activityDummyData,
          date: new Date('2023-03-01'),
          feeInAssetProfileCurrency: 0,
          feeInBaseCurrency: 0,
          quantity: 1,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: 'USD',
            dataSource: 'YAHOO',
            name: 'IBM',
            symbol: 'IBM'
          },
          type: 'DIVIDEND',
          unitPriceInAssetProfileCurrency: 1.65
        },
        {
          ...activityDummyData,
          date: new Date('2023-06-01'),
          feeInAssetProfileCurrency: 0,
          feeInBaseCurrency: 0,
          quantity: 1,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: 'USD',
            dataSource: 'YAHOO',
            name: 'IBM',
            symbol: 'IBM'
          },
          type: 'DIVIDEND',
          unitPriceInAssetProfileCurrency: 1.65
        }
      ];

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.ROAI,
        currency: 'USD',
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

      expect(portfolioSnapshot.positions).toHaveLength(2);

      const msftPosition = portfolioSnapshot.positions.find(
        ({ symbol }) => symbol === 'MSFT'
      );
      const ibmPosition = portfolioSnapshot.positions.find(
        ({ symbol }) => symbol === 'IBM'
      );

      // MSFT: 2.60 dividends / 300 investment = 0.00867 (0.867%)
      expect(msftPosition.dividendInBaseCurrency).toEqual(new Big('2.6'));
      expect(msftPosition.investmentWithCurrencyEffect).toEqual(new Big('300'));
      expect(msftPosition.annualizedDividendYield).toBeCloseTo(2.6 / 300, 5);

      // IBM: 6.60 dividends / 200 investment = 0.033 (3.3%)
      expect(ibmPosition.dividendInBaseCurrency).toEqual(new Big('6.6'));
      expect(ibmPosition.investmentWithCurrencyEffect).toEqual(new Big('200'));
      expect(ibmPosition.annualizedDividendYield).toBeCloseTo(6.6 / 200, 5);

      // Portfolio-wide: (2.60 + 6.60) / (300 + 200) = 9.20 / 500 = 0.0184 (1.84%)
      const totalDividends = new Big(msftPosition.dividendInBaseCurrency).plus(
        ibmPosition.dividendInBaseCurrency
      );
      const totalInvestment = new Big(
        msftPosition.investmentWithCurrencyEffect
      ).plus(ibmPosition.investmentWithCurrencyEffect);

      expect(totalDividends.toNumber()).toBe(9.2);
      expect(totalInvestment.toNumber()).toBe(500);

      // Test that portfolioSnapshot has aggregated annualizedDividendYield
      expect(portfolioSnapshot).toHaveProperty('annualizedDividendYield');
      expect(portfolioSnapshot.annualizedDividendYield).toBeCloseTo(0.0184, 4);
    });
  });
});
