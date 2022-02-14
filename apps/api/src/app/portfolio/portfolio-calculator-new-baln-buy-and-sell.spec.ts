import { CurrentRateService } from '@ghostfolio/api/app/portfolio/current-rate.service';
import { parseDate } from '@ghostfolio/common/helper';
import Big from 'big.js';

import { CurrentRateServiceMock } from './current-rate.service.mock';
import { PortfolioCalculatorNew } from './portfolio-calculator-new';

jest.mock('@ghostfolio/api/app/portfolio/current-rate.service', () => {
  return {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    CurrentRateService: jest.fn().mockImplementation(() => {
      return CurrentRateServiceMock;
    })
  };
});

describe('PortfolioCalculatorNew', () => {
  let currentRateService: CurrentRateService;

  beforeEach(() => {
    currentRateService = new CurrentRateService(null, null, null);
  });

  describe('get current positions', () => {
    it.only('with BALN.SW buy and sell', async () => {
      const portfolioCalculatorNew = new PortfolioCalculatorNew({
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

      portfolioCalculatorNew.computeTransactionPoints();

      const spy = jest
        .spyOn(Date, 'now')
        .mockImplementation(() => parseDate('2021-12-18').getTime());

      const currentPositions = await portfolioCalculatorNew.getCurrentPositions(
        parseDate('2021-11-22')
      );

      spy.mockRestore();

      expect(currentPositions).toEqual({
        currentValue: new Big('0'),
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
    });
  });
});
