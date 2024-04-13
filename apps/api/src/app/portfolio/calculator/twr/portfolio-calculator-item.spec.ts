import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import {
  activityDummyData,
  symbolProfileDummyData
} from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator-test-utils';
import {
  PortfolioCalculatorFactory,
  PerformanceCalculationType
} from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator.factory';
import { CurrentRateService } from '@ghostfolio/api/app/portfolio/current-rate.service';
import { CurrentRateServiceMock } from '@ghostfolio/api/app/portfolio/current-rate.service.mock';
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

describe('PortfolioCalculator', () => {
  let currentRateService: CurrentRateService;
  let exchangeRateDataService: ExchangeRateDataService;
  let factory: PortfolioCalculatorFactory;

  beforeEach(() => {
    currentRateService = new CurrentRateService(null, null, null, null);

    exchangeRateDataService = new ExchangeRateDataService(
      null,
      null,
      null,
      null
    );

    factory = new PortfolioCalculatorFactory(
      currentRateService,
      exchangeRateDataService
    );
  });

  describe('compute portfolio snapshot', () => {
    it.only('with item activity', async () => {
      const spy = jest
        .spyOn(Date, 'now')
        .mockImplementation(() => parseDate('2022-01-31').getTime());

      const activities: Activity[] = [
        {
          ...activityDummyData,
          date: new Date('2022-01-01'),
          fee: 0,
          quantity: 1,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: 'USD',
            dataSource: 'MANUAL',
            name: 'Penthouse Apartment',
            symbol: 'dac95060-d4f2-4653-a253-2c45e6fb5cde'
          },
          type: 'ITEM',
          unitPrice: 500000
        }
      ];

      const portfolioCalculator = factory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.TWR,
        currency: 'USD'
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot(
        parseDate('2022-01-01')
      );

      spy.mockRestore();

      expect(portfolioSnapshot).toEqual({
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
            averagePrice: new Big('500000'),
            currency: 'USD',
            dataSource: 'MANUAL',
            dividend: new Big('0'),
            dividendInBaseCurrency: new Big('0'),
            fee: new Big('0'),
            firstBuyDate: '2022-01-01',
            grossPerformance: null,
            grossPerformancePercentage: null,
            grossPerformancePercentageWithCurrencyEffect: null,
            grossPerformanceWithCurrencyEffect: null,
            investment: new Big('0'),
            investmentWithCurrencyEffect: new Big('0'),
            marketPrice: null,
            marketPriceInBaseCurrency: 500000,
            netPerformance: null,
            netPerformancePercentage: null,
            netPerformancePercentageWithCurrencyEffect: null,
            netPerformanceWithCurrencyEffect: null,
            quantity: new Big('0'),
            symbol: 'dac95060-d4f2-4653-a253-2c45e6fb5cde',
            tags: [],
            timeWeightedInvestment: new Big('0'),
            timeWeightedInvestmentWithCurrencyEffect: new Big('0'),
            transactionCount: 1,
            valueInBaseCurrency: new Big('0')
          }
        ],
        totalFeesWithCurrencyEffect: new Big('0'),
        totalInterestWithCurrencyEffect: new Big('0'),
        totalInvestment: new Big('0'),
        totalInvestmentWithCurrencyEffect: new Big('0'),
        totalLiabilitiesWithCurrencyEffect: new Big('0'),
        totalValuablesWithCurrencyEffect: new Big('0')
      });
    });
  });
});
