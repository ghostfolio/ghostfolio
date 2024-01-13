import { CurrentRateService } from '@ghostfolio/api/app/portfolio/current-rate.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { parseDate } from '@ghostfolio/common/helper';
import Big from 'big.js';

import { CurrentRateServiceMock } from './current-rate.service.mock';
import { PortfolioCalculator } from './portfolio-calculator';

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

  beforeEach(() => {
    currentRateService = new CurrentRateService(null, null);

    exchangeRateDataService = new ExchangeRateDataService(
      null,
      null,
      null,
      null
    );
  });

  describe('get current positions', () => {
    it.only('with NOVN.SW buy and sell', async () => {
      const portfolioCalculator = new PortfolioCalculator({
        currentRateService,
        exchangeRateDataService,
        currency: 'CHF',
        orders: [
          {
            currency: 'CHF',
            date: '2022-03-07',
            dataSource: 'YAHOO',
            fee: new Big(0),
            name: 'Novartis AG',
            quantity: new Big(2),
            symbol: 'NOVN.SW',
            type: 'BUY',
            unitPrice: new Big(75.8)
          },
          {
            currency: 'CHF',
            date: '2022-04-08',
            dataSource: 'YAHOO',
            fee: new Big(0),
            name: 'Novartis AG',
            quantity: new Big(2),
            symbol: 'NOVN.SW',
            type: 'SELL',
            unitPrice: new Big(85.73)
          }
        ]
      });

      portfolioCalculator.computeTransactionPoints();

      const spy = jest
        .spyOn(Date, 'now')
        .mockImplementation(() => parseDate('2022-04-11').getTime());

      const chartData = await portfolioCalculator.getChartData(
        parseDate('2022-03-07')
      );

      const currentPositions = await portfolioCalculator.getCurrentPositions(
        parseDate('2022-03-07')
      );

      const investments = portfolioCalculator.getInvestments();

      const investmentsByMonth =
        portfolioCalculator.getInvestmentsByGroup('month');

      spy.mockRestore();

      expect(chartData[0]).toEqual({
        date: '2022-03-07',
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
        currentValue: new Big('0'),
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
            transactionCount: 2
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
        { date: '2022-03-01', investment: new Big('151.6') },
        { date: '2022-04-01', investment: new Big('-171.46') }
      ]);
    });
  });
});
