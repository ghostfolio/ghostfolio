import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import {
  activityDummyData,
  symbolProfileDummyData
} from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator-test-utils';
import {
  PerformanceCalculationType,
  PortfolioCalculatorFactory
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
    it.only('with NOVN.SW buy and sell', async () => {
      const activities: Activity[] = [
        {
          ...activityDummyData,
          date: new Date('2022-03-07'),
          fee: 0,
          quantity: 2,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: 'CHF',
            dataSource: 'YAHOO',
            name: 'Novartis AG',
            symbol: 'NOVN.SW'
          },
          type: 'BUY',
          unitPrice: 75.8
        },
        {
          ...activityDummyData,
          date: new Date('2022-04-08'),
          fee: 0,
          quantity: 2,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: 'CHF',
            dataSource: 'YAHOO',
            name: 'Novartis AG',
            symbol: 'NOVN.SW'
          },
          type: 'SELL',
          unitPrice: 85.73
        }
      ];

      const portfolioCalculator = factory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.TWR,
        currency: 'CHF'
      });

      const spy = jest
        .spyOn(Date, 'now')
        .mockImplementation(() => parseDate('2022-04-11').getTime());

      const chartData = await portfolioCalculator.getChartData({
        start: parseDate('2022-03-07')
      });

      const currentPositions = await portfolioCalculator.getCurrentPositions(
        parseDate('2022-03-07')
      );

      const investments = portfolioCalculator.getInvestments();

      const investmentsByMonth = portfolioCalculator.getInvestmentsByGroup({
        data: chartData,
        groupBy: 'month'
      });

      spy.mockRestore();

      expect(chartData[0]).toEqual({
        date: '2022-03-07',
        investmentValueWithCurrencyEffect: 151.6,
        netPerformance: 0,
        netPerformanceInPercentage: 0,
        netPerformanceInPercentageWithCurrencyEffect: 0,
        netPerformanceWithCurrencyEffect: 0,
        totalInvestment: 151.6,
        totalInvestmentValueWithCurrencyEffect: 151.6,
        value: 151.6,
        valueWithCurrencyEffect: 151.6
      });

      expect(chartData[chartData.length - 1]).toEqual({
        date: '2022-04-11',
        investmentValueWithCurrencyEffect: 0,
        netPerformance: 19.86,
        netPerformanceInPercentage: 13.100263852242744,
        netPerformanceInPercentageWithCurrencyEffect: 13.100263852242744,
        netPerformanceWithCurrencyEffect: 19.86,
        totalInvestment: 0,
        totalInvestmentValueWithCurrencyEffect: 0,
        value: 0,
        valueWithCurrencyEffect: 0
      });

      expect(currentPositions).toEqual({
        currentValueInBaseCurrency: new Big('0'),
        errors: [],
        grossPerformance: new Big('19.86'),
        grossPerformancePercentage: new Big('0.13100263852242744063'),
        grossPerformancePercentageWithCurrencyEffect: new Big(
          '0.13100263852242744063'
        ),
        grossPerformanceWithCurrencyEffect: new Big('19.86'),
        hasErrors: false,
        netPerformance: new Big('19.86'),
        netPerformancePercentage: new Big('0.13100263852242744063'),
        netPerformancePercentageWithCurrencyEffect: new Big(
          '0.13100263852242744063'
        ),
        netPerformanceWithCurrencyEffect: new Big('19.86'),
        positions: [
          {
            averagePrice: new Big('0'),
            currency: 'CHF',
            dataSource: 'YAHOO',
            dividend: new Big('0'),
            dividendInBaseCurrency: new Big('0'),
            fee: new Big('0'),
            firstBuyDate: '2022-03-07',
            grossPerformance: new Big('19.86'),
            grossPerformancePercentage: new Big('0.13100263852242744063'),
            grossPerformancePercentageWithCurrencyEffect: new Big(
              '0.13100263852242744063'
            ),
            grossPerformanceWithCurrencyEffect: new Big('19.86'),
            investment: new Big('0'),
            investmentWithCurrencyEffect: new Big('0'),
            netPerformance: new Big('19.86'),
            netPerformancePercentage: new Big('0.13100263852242744063'),
            netPerformancePercentageWithCurrencyEffect: new Big(
              '0.13100263852242744063'
            ),
            netPerformanceWithCurrencyEffect: new Big('19.86'),
            marketPrice: 87.8,
            marketPriceInBaseCurrency: 87.8,
            quantity: new Big('0'),
            symbol: 'NOVN.SW',
            timeWeightedInvestment: new Big('151.6'),
            timeWeightedInvestmentWithCurrencyEffect: new Big('151.6'),
            transactionCount: 2,
            valueInBaseCurrency: new Big('0')
          }
        ],
        totalInvestment: new Big('0'),
        totalInvestmentWithCurrencyEffect: new Big('0')
      });

      expect(investments).toEqual([
        { date: '2022-03-07', investment: new Big('151.6') },
        { date: '2022-04-08', investment: new Big('0') }
      ]);

      expect(investmentsByMonth).toEqual([
        { date: '2022-03-01', investment: 151.6 },
        { date: '2022-04-01', investment: -151.6 }
      ]);
    });
  });
});
