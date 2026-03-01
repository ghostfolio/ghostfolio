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

  describe('Multi-asset dividend yield', () => {
    it('with MSFT and IBM positions verifies portfolio-wide dividend yield aggregation', async () => {
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
      expect(msftPosition.dividendYieldTrailingTwelveMonths).toBeCloseTo(
        2.6 / 300,
        5
      );

      // IBM: 6.60 dividends / 200 investment = 0.033 (3.3%)
      expect(ibmPosition.dividendInBaseCurrency).toEqual(new Big('6.6'));
      expect(ibmPosition.investmentWithCurrencyEffect).toEqual(new Big('200'));
      expect(ibmPosition.dividendYieldTrailingTwelveMonths).toBeCloseTo(
        6.6 / 200,
        5
      );

      // Portfolio-wide: (2.60 + 6.60) / (300 + 200) = 9.20 / 500 = 0.0184 (1.84%)
      const totalDividends = new Big(msftPosition.dividendInBaseCurrency).plus(
        ibmPosition.dividendInBaseCurrency
      );
      const totalInvestment = new Big(
        msftPosition.investmentWithCurrencyEffect
      ).plus(ibmPosition.investmentWithCurrencyEffect);

      expect(totalDividends.toNumber()).toBe(9.2);
      expect(totalInvestment.toNumber()).toBe(500);

      // Verify portfolio-level dividend yield aggregation
      expect(portfolioSnapshot).toHaveProperty(
        'dividendYieldTrailingTwelveMonths'
      );
      expect(portfolioSnapshot.dividendYieldTrailingTwelveMonths).toBeCloseTo(
        0.0184,
        4
      );
    });

    it('ignores dividends older than 12 months when aggregating portfolio yield', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2023-07-10').getTime());

      const activities: Activity[] = [
        // MSFT: 1 share @ 300, 3 dividends total (one older than 12 months)
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
        // IBM: 1 share @ 200, 2 dividends total (one older than 12 months)
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
          date: new Date('2022-06-01'),
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

      const msftPosition = portfolioSnapshot.positions.find(
        ({ symbol }) => symbol === 'MSFT'
      );
      const ibmPosition = portfolioSnapshot.positions.find(
        ({ symbol }) => symbol === 'IBM'
      );

      expect(msftPosition.dividendInBaseCurrency).toEqual(new Big('1.92'));
      expect(ibmPosition.dividendInBaseCurrency).toEqual(new Big('3.3'));

      const msftDividendLast12Months = new Big('1.3');
      const ibmDividendLast12Months = new Big('1.65');
      const totalInvestment = new Big('500');

      expect(msftPosition.dividendYieldTrailingTwelveMonths).toBeCloseTo(
        msftDividendLast12Months.div(new Big('300')).toNumber(),
        6
      );
      expect(ibmPosition.dividendYieldTrailingTwelveMonths).toBeCloseTo(
        ibmDividendLast12Months.div(new Big('200')).toNumber(),
        6
      );

      const expectedDividendYield = msftDividendLast12Months
        .plus(ibmDividendLast12Months)
        .div(totalInvestment)
        .toNumber();

      expect(portfolioSnapshot.dividendYieldTrailingTwelveMonths).toBeCloseTo(
        expectedDividendYield,
        6
      );
    });
  });
});
