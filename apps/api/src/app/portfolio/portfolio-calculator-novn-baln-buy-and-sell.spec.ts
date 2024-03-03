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
    currentRateService = new CurrentRateService(null, null, null, null);

    exchangeRateDataService = new ExchangeRateDataService(
      null,
      null,
      null,
      null
    );
  });

  describe('get current positions', () => {
    it.only('with NOVN.SW and BALN.SW buy and sell', async () => {
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
            date: '2022-04-01',
            dataSource: 'YAHOO',
            fee: new Big(0),
            name: 'Novartis AG',
            quantity: new Big(0),
            symbol: 'NOVN.SW',
            type: 'BUY',
            unitPrice: new Big(80.0)
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
          },
          {
            currency: 'CHF',
            date: '2022-03-22',
            dataSource: 'YAHOO',
            fee: new Big(1.55),
            name: 'Bâloise Holding AG',
            quantity: new Big(2),
            symbol: 'BALN.SW',
            type: 'BUY',
            unitPrice: new Big(142.9)
          },
          {
            currency: 'CHF',
            date: '2022-04-01',
            dataSource: 'YAHOO',
            fee: new Big(0),
            name: 'Bâloise Holding AG',
            quantity: new Big(0),
            symbol: 'BALN.SW',
            type: 'BUY',
            unitPrice: new Big(138)
          },
          {
            currency: 'CHF',
            date: '2022-04-10',
            dataSource: 'YAHOO',
            fee: new Big(1.65),
            name: 'Bâloise Holding AG',
            quantity: new Big(2),
            symbol: 'BALN.SW',
            type: 'SELL',
            unitPrice: new Big(136.6)
          }
        ]
      });

      portfolioCalculator.computeTransactionPoints();

      const spy = jest
        .spyOn(Date, 'now')
        .mockImplementation(() => parseDate('2022-04-11').getTime());

      const chartData = await portfolioCalculator.getChartData({
        start: parseDate('2022-03-07'),
        calculateTimeWeightedPerformance: true
      });

      spy.mockRestore();

      expect(chartData[0]).toEqual({
        date: '2022-03-07',
        investmentValueWithCurrencyEffect: 151.6,
        netPerformance: 0,
        netPerformanceInPercentage: 0,
        netPerformanceInPercentageWithCurrencyEffect: 0,
        netPerformanceWithCurrencyEffect: 0,
        timeWeightedPerformance: 0,
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
        timeWeightedPerformance: 0,
        totalInvestment: 0,
        totalInvestmentValueWithCurrencyEffect: 0,
        value: 0,
        valueWithCurrencyEffect: 0
      });
    });
  });
});
