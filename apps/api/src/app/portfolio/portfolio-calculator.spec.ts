import Big from 'big.js';

import { CurrentRateService } from './current-rate.service';
import { PortfolioCalculator } from './portfolio-calculator';

describe('PortfolioCalculator', () => {
  let currentRateService: CurrentRateService;

  beforeEach(() => {
    currentRateService = new CurrentRateService(null, null, null);
  });

  describe('annualized performance percentage', () => {
    const portfolioCalculator = new PortfolioCalculator({
      currentRateService,
      currency: 'USD',
      orders: []
    });

    it('Get annualized performance', async () => {
      expect(
        portfolioCalculator
          .getAnnualizedPerformancePercent({
            daysInMarket: NaN, // differenceInDays of date-fns returns NaN for the same day
            netPerformancePercent: new Big(0)
          })
          .toNumber()
      ).toEqual(0);

      expect(
        portfolioCalculator
          .getAnnualizedPerformancePercent({
            daysInMarket: 0,
            netPerformancePercent: new Big(0)
          })
          .toNumber()
      ).toEqual(0);

      /**
       * Source: https://www.readyratios.com/reference/analysis/annualized_rate.html
       */
      expect(
        portfolioCalculator
          .getAnnualizedPerformancePercent({
            daysInMarket: 65, // < 1 year
            netPerformancePercent: new Big(0.1025)
          })
          .toNumber()
      ).toBeCloseTo(0.729705);

      expect(
        portfolioCalculator
          .getAnnualizedPerformancePercent({
            daysInMarket: 365, // 1 year
            netPerformancePercent: new Big(0.05)
          })
          .toNumber()
      ).toBeCloseTo(0.05);

      /**
       * Source: https://www.investopedia.com/terms/a/annualized-total-return.asp#annualized-return-formula-and-calculation
       */
      expect(
        portfolioCalculator
          .getAnnualizedPerformancePercent({
            daysInMarket: 575, // > 1 year
            netPerformancePercent: new Big(0.2374)
          })
          .toNumber()
      ).toBeCloseTo(0.145);
    });
  });
});
