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
    it.only('with NOVN.SW buy and sell partially', async () => {
      const portfolioCalculator = new PortfolioCalculator({
        currentRateService,
        exchangeRateDataService,
        currency: 'CHF',
        orders: [
          {
            currency: 'CHF',
            date: '2022-03-07',
            dataSource: 'YAHOO',
            fee: new Big(1.3),
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
            fee: new Big(2.95),
            name: 'Novartis AG',
            quantity: new Big(1),
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

      const currentPositions = await portfolioCalculator.getCurrentPositions(
        parseDate('2022-03-07')
      );

      const investments = portfolioCalculator.getInvestments();

      const investmentsByMonth =
        portfolioCalculator.getInvestmentsByGroup('month');

      spy.mockRestore();

      expect(currentPositions).toEqual({
        currentValue: new Big('87.8'),
        errors: [],
        grossPerformance: new Big('21.93'),
        grossPerformancePercentage: new Big('0.15113417083448194384'),
        grossPerformancePercentageWithCurrencyEffect: new Big(
          '0.15113417083448194384'
        ),
        grossPerformanceWithCurrencyEffect: new Big('21.93'),
        hasErrors: false,
        netPerformance: new Big('17.68'),
        netPerformancePercentage: new Big('0.12184460284330327256'),
        netPerformancePercentageWithCurrencyEffect: new Big(
          '0.12184460284330327256'
        ),
        netPerformanceWithCurrencyEffect: new Big('17.68'),
        positions: [
          {
            averagePrice: new Big('75.80'),
            currency: 'CHF',
            dataSource: 'YAHOO',
            fee: new Big('4.25'),
            firstBuyDate: '2022-03-07',
            grossPerformance: new Big('21.93'),
            grossPerformancePercentage: new Big('0.15113417083448194384'),
            grossPerformancePercentageWithCurrencyEffect: new Big(
              '0.15113417083448194384'
            ),
            grossPerformanceWithCurrencyEffect: new Big('21.93'),
            investment: new Big('75.80'),
            investmentWithCurrencyEffect: new Big('75.80'),
            netPerformance: new Big('17.68'),
            netPerformancePercentage: new Big('0.12184460284330327256'),
            netPerformancePercentageWithCurrencyEffect: new Big(
              '0.12184460284330327256'
            ),
            netPerformanceWithCurrencyEffect: new Big('17.68'),
            marketPrice: 87.8,
            marketPriceInBaseCurrency: 87.8,
            quantity: new Big('1'),
            symbol: 'NOVN.SW',
            timeWeightedInvestment: new Big('145.10285714285714285714'),
            timeWeightedInvestmentWithCurrencyEffect: new Big(
              '145.10285714285714285714'
            ),
            transactionCount: 2
          }
        ],
        totalInvestment: new Big('75.80'),
        totalInvestmentWithCurrencyEffect: new Big('75.80')
      });

      expect(investments).toEqual([
        { date: '2022-03-07', investment: new Big('151.6') },
        { date: '2022-04-08', investment: new Big('75.8') }
      ]);

      expect(investmentsByMonth).toEqual([
        { date: '2022-03-01', investment: new Big('151.6') },
        { date: '2022-04-01', investment: new Big('-85.73') }
      ]);
    });
  });
});
