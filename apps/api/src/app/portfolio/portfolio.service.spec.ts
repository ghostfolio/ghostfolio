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

  it('Get annualized performance', async () => {
    expect(
      portfolioService.getAnnualizedPerformancePercent({
        daysInMarket: NaN, // differenceInDays of date-fns returns NaN for the same day
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
        daysInMarket: 365, // 1 year
        netPerformancePercent: 0.05
      })
    ).toBeCloseTo(0.05);

    /**
     * Source: https://www.investopedia.com/terms/a/annualized-total-return.asp#annualized-return-formula-and-calculation
     */
    expect(
      portfolioService.getAnnualizedPerformancePercent({
        daysInMarket: 575,
        netPerformancePercent: 0.2374
      })
    ).toEqual(0.1447846830315136);
  });
});
