import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

import { BadRequestException } from '@nestjs/common';

import { PortfolioService } from './portfolio.service';

describe('Portfolio calendar performance service integration', () => {
  const userId = 'synthetic-user';
  const period = (startDate: string, endDate = startDate) => ({
    startDate,
    endDate
  });

  const setup = ({
    dates = ['2026-01-01', '2026-01-02', '2026-01-03'],
    method = PerformanceCalculationType.ROAI,
    hasErrors = false
  }: {
    dates?: string[];
    method?: PerformanceCalculationType;
    hasErrors?: boolean;
  } = {}) => {
    const getPerformance = jest.fn(
      async ({ start, end }: { start: Date; end: Date }) => ({
        chart: [
          { date: start.toISOString().slice(0, 10) },
          {
            date: end.toISOString().slice(0, 10),
            netPerformanceInPercentageWithCurrencyEffect: 0.125
          }
        ]
      })
    );
    const getSnapshot = jest.fn(async () => ({
      hasErrors,
      historicalData: dates.map((date) => ({ date }))
    }));
    const createCalculator = jest.fn(() => ({ getPerformance, getSnapshot }));
    const getAccountBalanceItems = jest.fn(async () => []);
    const getActivitiesForPortfolioCalculator = jest.fn(async () => ({
      activities: [{ type: 'BUY' }]
    }));
    const getUser = jest.fn(async () => ({
      settings: {
        settings: { baseCurrency: 'EUR', performanceCalculationType: method }
      }
    }));
    // Exercise the actual service implementation with synthetic dependency results.
    // No database, market-data provider, HTTP session or private portfolio is needed.
    const service = Object.assign(Object.create(PortfolioService.prototype), {
      accountBalanceService: { getAccountBalanceItems },
      activitiesService: { getActivitiesForPortfolioCalculator },
      calculatorFactory: { createCalculator },
      userService: { user: getUser }
    }) as PortfolioService;

    // The configured methodology and currency are normally resolved from user settings.
    Object.assign(service, {
      getUserPerformanceCalculationType: () => method,
      getUserCurrency: () => 'EUR'
    });

    return {
      service,
      createCalculator,
      getPerformance,
      getSnapshot,
      getAccountBalanceItems,
      getActivitiesForPortfolioCalculator
    };
  };

  it('reuses one calculator and calculates each period from the previous calendar day', async () => {
    const { service, createCalculator, getPerformance, getSnapshot } = setup();
    const results = await service.getCalendarPerformancePercentages({
      userId,
      periods: [period('2026-01-02'), period('2026-01-03')]
    });

    expect(results).toEqual([
      { ...period('2026-01-02'), percentage: 12.5 },
      { ...period('2026-01-03'), percentage: 12.5 }
    ]);
    expect(createCalculator).toHaveBeenCalledTimes(1);
    expect(getSnapshot).toHaveBeenCalledTimes(1);
    expect(getPerformance).toHaveBeenCalledTimes(2);
    expect(
      getPerformance.mock.calls.map(([dates]) => [
        dates.start.toISOString().slice(0, 10),
        dates.end.toISOString().slice(0, 10)
      ])
    ).toEqual([
      ['2026-01-01', '2026-01-02'],
      ['2026-01-02', '2026-01-03']
    ]);
  });

  it('does not calculate a percentage if the baseline or endpoint is missing', async () => {
    const { service, getPerformance } = setup({ dates: ['2026-01-02'] });
    expect(
      await service.getCalendarPerformancePercentages({
        userId,
        periods: [period('2026-01-02'), period('2026-01-03')]
      })
    ).toEqual([period('2026-01-02'), period('2026-01-03')]);
    expect(getPerformance).not.toHaveBeenCalled();
  });

  it('does not return synthetic percentages when the snapshot contains errors', async () => {
    const { service, getPerformance } = setup({ hasErrors: true });
    expect(
      await service.getCalendarPerformancePercentages({
        userId,
        periods: [period('2026-01-02')]
      })
    ).toEqual([period('2026-01-02')]);
    expect(getPerformance).not.toHaveBeenCalled();
  });

  it('avoids initializing a calculator for an unsupported methodology', async () => {
    const { service, createCalculator } = setup({
      method: PerformanceCalculationType.TWR
    });
    expect(
      await service.getCalendarPerformancePercentages({
        userId,
        periods: [period('2026-01-02')]
      })
    ).toEqual([period('2026-01-02')]);
    expect(createCalculator).not.toHaveBeenCalled();
  });

  it('rejects inverted, future, malformed, or excessive batches before fetching data', async () => {
    const { service, getAccountBalanceItems } = setup();
    const invalid = [
      [period('2026-01-03', '2026-01-02')],
      [period('2026-13-01')],
      [period('2099-01-02')],
      Array.from({ length: 56 }, () => period('2026-01-02'))
    ];
    for (const periods of invalid) {
      await expect(
        service.getCalendarPerformancePercentages({ userId, periods })
      ).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(getAccountBalanceItems).not.toHaveBeenCalled();
  });
});
