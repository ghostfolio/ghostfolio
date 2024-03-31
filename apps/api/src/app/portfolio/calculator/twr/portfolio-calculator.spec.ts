import {
  PerformanceCalculationType,
  PortfolioCalculatorFactory
} from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator.factory';
import { CurrentRateService } from '@ghostfolio/api/app/portfolio/current-rate.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';

import { Big } from 'big.js';

describe('PortfolioCalculator', () => {
  let currentRateService: CurrentRateService;
  let exchangeRateDataService: ExchangeRateDataService;
  let factory: PortfolioCalculatorFactory;

  beforeEach(() => {
    currentRateService = new CurrentRateService(null, null, null, null);

    exchangeRateDataService = new ExchangeRateDataService(
      null,
      null,
      null,
      null
    );

    factory = new PortfolioCalculatorFactory(
      currentRateService,
      exchangeRateDataService
    );
  });

  describe('annualized performance percentage', () => {
    it('Get annualized performance', async () => {
      const portfolioCalculator = factory.createCalculator({
        activities: [],
        calculationType: PerformanceCalculationType.TWR,
        currency: 'CHF'
      });

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
