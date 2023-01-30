import { CurrentRateService } from '@ghostfolio/api/app/portfolio/current-rate.service';
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

  beforeEach(() => {
    currentRateService = new CurrentRateService(null, null, null);
  });

  describe('get current positions', () => {
    it.only('with BALN.SW buy and sell', async () => {
      const portfolioCalculator = new PortfolioCalculator({
        currentRateService,
        currency: 'CHF',
        orders: [
          {
            currency: 'CHF',
            date: '2021-11-22',
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
            date: '2021-11-30',
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
        .mockImplementation(() => parseDate('2021-12-18').getTime());

      const currentPositions = await portfolioCalculator.getCurrentPositions(
        parseDate('2021-11-22')
      );

      const investments = portfolioCalculator.getInvestments();

      const investmentsByMonth =
        portfolioCalculator.getInvestmentsByGroup('month');

      spy.mockRestore();

      expect(currentPositions).toEqual({
        currentValue: new Big('0'),
        errors: [],
        grossPerformance: new Big('-12.6'),
        grossPerformancePercentage: new Big('-0.0440867739678096571'),
        hasErrors: false,
        netPerformance: new Big('-15.8'),
        netPerformancePercentage: new Big('-0.0552834149755073478'),
        positions: [
          {
            averagePrice: new Big('0'),
            currency: 'CHF',
            dataSource: 'YAHOO',
            fee: new Big('3.2'),
            firstBuyDate: '2021-11-22',
            grossPerformance: new Big('-12.6'),
            grossPerformancePercentage: new Big('-0.0440867739678096571'),
            investment: new Big('0'),
            netPerformance: new Big('-15.8'),
            netPerformancePercentage: new Big('-0.0552834149755073478'),
            marketPrice: 148.9,
            quantity: new Big('0'),
            symbol: 'BALN.SW',
            transactionCount: 2
          }
        ],
        totalInvestment: new Big('0')
      });

      expect(investments).toEqual([
        { date: '2021-11-22', investment: new Big('285.8') },
        { date: '2021-11-30', investment: new Big('0') }
      ]);

      expect(investmentsByMonth).toEqual([
        { date: '2021-11-01', investment: new Big('12.6') }
      ]);
    });
  });
});
