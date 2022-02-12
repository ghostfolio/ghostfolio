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
    it.only('with BALN.SW buy', async () => {
      const portfolioCalculatorNew = new PortfolioCalculatorNew({
        currentRateService,
        currency: 'CHF',
        orders: [
          {
            currency: 'CHF',
            date: '2021-11-30',
            dataSource: 'YAHOO',
            fee: new Big(1.55),
            name: 'Bâloise Holding AG',
            quantity: new Big(2),
            symbol: 'BALN.SW',
            type: 'BUY',
            unitPrice: new Big(136.6)
          }
        ]
      });

      portfolioCalculatorNew.computeTransactionPoints();

      const spy = jest
        .spyOn(Date, 'now')
        .mockImplementation(() => parseDate('2021-12-18').getTime());

      const currentPositions = await portfolioCalculatorNew.getCurrentPositions(
        parseDate('2021-11-30')
      );

      spy.mockRestore();

      expect(currentPositions).toEqual({
        currentValue: new Big('297.8'),
        grossPerformance: new Big('24.6'),
        grossPerformancePercentage: new Big('0.09004392386530014641'),
        hasErrors: false,
        netPerformance: new Big('23.05'),
        netPerformancePercentage: new Big('0.08437042459736456808'),
        positions: [
          {
            averagePrice: new Big('136.6'),
            currency: 'CHF',
            dataSource: 'YAHOO',
            firstBuyDate: '2021-11-30',
            grossPerformance: new Big('24.6'),
            grossPerformancePercentage: new Big('0.09004392386530014641'),
            investment: new Big('273.2'),
            netPerformance: new Big('23.05'),
            netPerformancePercentage: new Big('0.08437042459736456808'),
            marketPrice: 148.9,
            quantity: new Big('2'),
            symbol: 'BALN.SW',
            transactionCount: 1
          }
        ],
        totalInvestment: new Big('273.2')
      });
    });
  });
});
