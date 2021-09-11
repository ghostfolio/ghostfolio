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
      null
    );
  });

  /**
   * Source: https://www.investopedia.com/terms/a/annualized-total-return.asp#annualized-return-formula-and-calculation
   */
  fit('Get annualized performance', async () => {
    expect(
      portfolioService.getAnnualizedPerformancePercent({
        daysInMarket: NaN,
        netPerformancePercent: 0
      })
    ).toEqual(0);

    expect(
      portfolioService.getAnnualizedPerformancePercent({
        daysInMarket: 0,
        netPerformancePercent: 0
      })
    ).toEqual(0);

    expect(
      portfolioService.getAnnualizedPerformancePercent({
        daysInMarket: 575,
        netPerformancePercent: 0.2374
      })
    ).toEqual(0.1447846830315136);
  });
});
