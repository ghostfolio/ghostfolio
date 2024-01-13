import { CurrentRateService } from '@ghostfolio/api/app/portfolio/current-rate.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { ExchangeRateDataServiceMock } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service.mock';
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

jest.mock(
  '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service',
  () => {
    return {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      ExchangeRateDataService: jest.fn().mockImplementation(() => {
        return ExchangeRateDataServiceMock;
      })
    };
  }
);

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
    it.only('with BTCUSD buy and sell partially', async () => {
      const portfolioCalculator = new PortfolioCalculator({
        currentRateService,
        exchangeRateDataService,
        currency: 'CHF',
        orders: [
          {
            currency: 'USD',
            date: '2015-01-01',
            dataSource: 'YAHOO',
            fee: new Big(0),
            name: 'Bitcoin USD',
            quantity: new Big(2),
            symbol: 'BTCUSD',
            type: 'BUY',
            unitPrice: new Big(320.43)
          },
          {
            currency: 'USD',
            date: '2017-12-31',
            dataSource: 'YAHOO',
            fee: new Big(0),
            name: 'Bitcoin USD',
            quantity: new Big(1),
            symbol: 'BTCUSD',
            type: 'SELL',
            unitPrice: new Big(14156.4)
          }
        ]
      });

      portfolioCalculator.computeTransactionPoints();

      const spy = jest
        .spyOn(Date, 'now')
        .mockImplementation(() => parseDate('2018-01-01').getTime());

      const currentPositions = await portfolioCalculator.getCurrentPositions(
        parseDate('2015-01-01')
      );

      const investments = portfolioCalculator.getInvestments();

      const investmentsByMonth =
        portfolioCalculator.getInvestmentsByGroup('month');

      spy.mockRestore();

      expect(currentPositions).toEqual({
        currentValue: new Big('13298.425356'),
        errors: [],
        grossPerformance: new Big('27172.74'),
        grossPerformancePercentage: new Big('42.41978276196153750666'),
        grossPerformancePercentageWithCurrencyEffect: new Big(
          '41.6401219622042072686'
        ),
        grossPerformanceWithCurrencyEffect: new Big('26516.208701400000064086'),
        hasErrors: false,
        netPerformance: new Big('27172.74'),
        netPerformancePercentage: new Big('42.41978276196153750666'),
        netPerformancePercentageWithCurrencyEffect: new Big(
          '41.6401219622042072686'
        ),
        netPerformanceWithCurrencyEffect: new Big('26516.208701400000064086'),
        positions: [
          {
            averagePrice: new Big('320.43'),
            currency: 'USD',
            dataSource: 'YAHOO',
            fee: new Big('0'),
            firstBuyDate: '2015-01-01',
            grossPerformance: new Big('27172.74'),
            grossPerformancePercentage: new Big('42.41978276196153750666'),
            grossPerformancePercentageWithCurrencyEffect: new Big(
              '41.6401219622042072686'
            ),
            grossPerformanceWithCurrencyEffect: new Big(
              '26516.208701400000064086'
            ),
            investment: new Big('320.43'),
            investmentWithCurrencyEffect: new Big('318.542667299999967957'),
            marketPrice: 13657.2,
            marketPriceInBaseCurrency: 13298.425356,
            netPerformance: new Big('27172.74'),
            netPerformancePercentage: new Big('42.41978276196153750666'),
            netPerformancePercentageWithCurrencyEffect: new Big(
              '41.6401219622042072686'
            ),
            netPerformanceWithCurrencyEffect: new Big(
              '26516.208701400000064086'
            ),
            quantity: new Big('1'),
            symbol: 'BTCUSD',
            tags: undefined,
            timeWeightedInvestment: new Big('640.56763686131386861314'),
            timeWeightedInvestmentWithCurrencyEffect: new Big(
              '636.79469348020066587024'
            ),
            transactionCount: 2
          }
        ],
        totalInvestment: new Big('320.43'),
        totalInvestmentWithCurrencyEffect: new Big('318.542667299999967957')
      });

      expect(investments).toEqual([
        { date: '2015-01-01', investment: new Big('640.86') },
        { date: '2017-12-31', investment: new Big('320.43') }
      ]);

      expect(investmentsByMonth).toEqual([
        { date: '2015-01-01', investment: new Big('640.86') },
        { date: '2015-02-01', investment: new Big('0') },
        { date: '2015-03-01', investment: new Big('0') },
        { date: '2015-04-01', investment: new Big('0') },
        { date: '2015-05-01', investment: new Big('0') },
        { date: '2015-06-01', investment: new Big('0') },
        { date: '2015-07-01', investment: new Big('0') },
        { date: '2015-08-01', investment: new Big('0') },
        { date: '2015-09-01', investment: new Big('0') },
        { date: '2015-10-01', investment: new Big('0') },
        { date: '2015-11-01', investment: new Big('0') },
        { date: '2015-12-01', investment: new Big('0') },
        { date: '2016-01-01', investment: new Big('0') },
        { date: '2016-02-01', investment: new Big('0') },
        { date: '2016-03-01', investment: new Big('0') },
        { date: '2016-04-01', investment: new Big('0') },
        { date: '2016-05-01', investment: new Big('0') },
        { date: '2016-06-01', investment: new Big('0') },
        { date: '2016-07-01', investment: new Big('0') },
        { date: '2016-08-01', investment: new Big('0') },
        { date: '2016-09-01', investment: new Big('0') },
        { date: '2016-10-01', investment: new Big('0') },
        { date: '2016-11-01', investment: new Big('0') },
        { date: '2016-12-01', investment: new Big('0') },
        { date: '2017-01-01', investment: new Big('0') },
        { date: '2017-02-01', investment: new Big('0') },
        { date: '2017-03-01', investment: new Big('0') },
        { date: '2017-04-01', investment: new Big('0') },
        { date: '2017-05-01', investment: new Big('0') },
        { date: '2017-06-01', investment: new Big('0') },
        { date: '2017-07-01', investment: new Big('0') },
        { date: '2017-08-01', investment: new Big('0') },
        { date: '2017-09-01', investment: new Big('0') },
        { date: '2017-10-01', investment: new Big('0') },
        { date: '2017-11-01', investment: new Big('0') },
        { date: '2017-12-01', investment: new Big('-14156.4') }
      ]);
    });
  });
});
