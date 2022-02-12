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
    it('with no orders', async () => {
      const portfolioCalculatorNew = new PortfolioCalculatorNew({
        currentRateService,
        currency: 'CHF',
        orders: []
      });

      portfolioCalculatorNew.computeTransactionPoints();

      const spy = jest
        .spyOn(Date, 'now')
        .mockImplementation(() => parseDate('2021-12-18').getTime());

      const currentPositions = await portfolioCalculatorNew.getCurrentPositions(
        new Date()
      );

      spy.mockRestore();

      expect(currentPositions).toEqual({
        currentValue: new Big(0),
        grossPerformance: new Big(0),
        grossPerformancePercentage: new Big(0),
        hasErrors: false,
        netPerformance: new Big(0),
        netPerformancePercentage: new Big(0),
        positions: [],
        totalInvestment: new Big(0)
      });
    });
  });
});
