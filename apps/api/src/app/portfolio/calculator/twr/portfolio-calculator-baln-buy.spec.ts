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

  describe('get current positions', () => {
    it.only('with BALN.SW buy', async () => {
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
        currency: 'CHF'
      });

      const spy = jest
        .spyOn(Date, 'now')
        .mockImplementation(() => parseDate('2021-12-18').getTime());

      const chartData = await portfolioCalculator.getChartData({
        start: parseDate('2021-11-30')
      });

      const currentPositions = await portfolioCalculator.getCurrentPositions(
        parseDate('2021-11-30')
      );

      const investments = portfolioCalculator.getInvestments();

      const investmentsByMonth = portfolioCalculator.getInvestmentsByGroup({
        data: chartData,
        groupBy: 'month'
      });

      spy.mockRestore();

      expect(currentPositions).toEqual({
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
            marketPrice: 148.9,
            marketPriceInBaseCurrency: 148.9,
            quantity: new Big('2'),
            symbol: 'BALN.SW',
            timeWeightedInvestment: new Big('273.2'),
            timeWeightedInvestmentWithCurrencyEffect: new Big('273.2'),
            transactionCount: 1,
            valueInBaseCurrency: new Big('297.8')
          }
        ],
        totalInvestment: new Big('273.2'),
        totalInvestmentWithCurrencyEffect: new Big('273.2')
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
