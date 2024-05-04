import { Big } from 'big.js';

import { PortfolioService } from './portfolio.service';

describe('PortfolioService', () => {
  let portfolioService: PortfolioService;

  beforeAll(async () => {
    portfolioService = new PortfolioService(
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    );
  });

  describe('annualized performance percentage', () => {
    it('Get annualized performance', async () => {
      expect(
        portfolioService
          .getAnnualizedPerformancePercent({
            daysInMarket: NaN, // differenceInDays of date-fns returns NaN for the same day
            netPerformancePercentage: new Big(0)
          })
          .toNumber()
      ).toEqual(0);

      expect(
        portfolioService
          .getAnnualizedPerformancePercent({
            daysInMarket: 0,
            netPerformancePercentage: new Big(0)
          })
          .toNumber()
      ).toEqual(0);

      /**
       * Source: https://www.readyratios.com/reference/analysis/annualized_rate.html
       */
      expect(
        portfolioService
          .getAnnualizedPerformancePercent({
            daysInMarket: 65, // < 1 year
            netPerformancePercentage: new Big(0.1025)
          })
          .toNumber()
      ).toBeCloseTo(0.729705);

      expect(
        portfolioService
          .getAnnualizedPerformancePercent({
            daysInMarket: 365, // 1 year
            netPerformancePercentage: new Big(0.05)
          })
          .toNumber()
      ).toBeCloseTo(0.05);

      /**
       * Source: https://www.investopedia.com/terms/a/annualized-total-return.asp#annualized-return-formula-and-calculation
       */
      expect(
        portfolioService
          .getAnnualizedPerformancePercent({
            daysInMarket: 575, // > 1 year
            netPerformancePercentage: new Big(0.2374)
          })
          .toNumber()
      ).toBeCloseTo(0.145);
    });
  });
});
