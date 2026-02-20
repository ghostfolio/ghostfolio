import { PortfolioCalculator } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator';
import { parseDate } from '@ghostfolio/common/helper';
import { HistoricalDataItem } from '@ghostfolio/common/interfaces';

import { getPerformanceByYear } from './portfolio-chart.helper';

describe('getPerformanceByYear', () => {
  let mockGetPerformance: jest.Mock;
  let portfolioCalculator: PortfolioCalculator;

  beforeEach(() => {
    mockGetPerformance = jest.fn();
    portfolioCalculator = {
      getPerformance: mockGetPerformance
    } as unknown as PortfolioCalculator;
  });

  it('calls getPerformance once per year with correct intervals', async () => {
    // Range spans two years: 2021-06-15 to 2022-03-10
    mockGetPerformance.mockResolvedValue({
      chart: [{ date: '2021-12-31', netPerformance: 100 }]
    });

    await getPerformanceByYear({
      end: parseDate('2022-03-10'),
      portfolioCalculator,
      start: parseDate('2021-06-15')
    });

    expect(mockGetPerformance).toHaveBeenCalledTimes(2);

    // First year: clamped start to actual start date, end to Dec 31
    const firstCall = mockGetPerformance.mock.calls[0][0];
    expect(firstCall.start).toEqual(parseDate('2021-06-15'));
    expect(firstCall.end.getFullYear()).toEqual(2021);
    expect(firstCall.end.getMonth()).toEqual(11); // December
    expect(firstCall.end.getDate()).toEqual(31);

    // Second year: starts Jan 1, clamped end to actual end date
    const secondCall = mockGetPerformance.mock.calls[1][0];
    expect(secondCall.start).toEqual(parseDate('2022-01-01'));
    expect(secondCall.end).toEqual(parseDate('2022-03-10'));
  });

  it('normalizes output dates to YYYY-01-01', async () => {
    mockGetPerformance.mockResolvedValue({
      chart: [{ date: '2023-07-15', netPerformance: 50, netWorth: 1000 }]
    });

    const result = await getPerformanceByYear({
      end: parseDate('2023-12-31'),
      portfolioCalculator,
      start: parseDate('2023-03-01')
    });

    expect(result).toHaveLength(1);
    expect(result[0].date).toEqual('2023-01-01');
  });

  it('uses last chart entry for each year', async () => {
    mockGetPerformance.mockResolvedValue({
      chart: [
        { date: '2024-01-15', netPerformance: 10 },
        { date: '2024-06-15', netPerformance: 50 },
        { date: '2024-12-31', netPerformance: 100 }
      ]
    });

    const result = await getPerformanceByYear({
      end: parseDate('2024-12-31'),
      portfolioCalculator,
      start: parseDate('2024-01-01')
    });

    expect(result).toHaveLength(1);
    expect(result[0].netPerformance).toEqual(100);
  });

  it('handles single-year range', async () => {
    mockGetPerformance.mockResolvedValue({
      chart: [{ date: '2023-05-01', netPerformance: 200 }]
    });

    const result = await getPerformanceByYear({
      end: parseDate('2023-09-30'),
      portfolioCalculator,
      start: parseDate('2023-05-01')
    });

    expect(mockGetPerformance).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ date: '2023-01-01', netPerformance: 200 });
  });

  it('handles three-year range', async () => {
    mockGetPerformance
      .mockResolvedValueOnce({
        chart: [{ date: '2021-12-31', netPerformance: 100 }]
      })
      .mockResolvedValueOnce({
        chart: [{ date: '2022-12-31', netPerformance: 200 }]
      })
      .mockResolvedValueOnce({
        chart: [{ date: '2023-06-30', netPerformance: 150 }]
      });

    const result = await getPerformanceByYear({
      end: parseDate('2023-06-30'),
      portfolioCalculator,
      start: parseDate('2021-03-01')
    });

    expect(mockGetPerformance).toHaveBeenCalledTimes(3);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.date)).toEqual([
      '2021-01-01',
      '2022-01-01',
      '2023-01-01'
    ]);
    expect(result.map((r) => r.netPerformance)).toEqual([100, 200, 150]);
  });

  it('skips years where getPerformance returns empty chart', async () => {
    mockGetPerformance
      .mockResolvedValueOnce({
        chart: [{ date: '2021-12-31', netPerformance: 100 }]
      })
      .mockResolvedValueOnce({ chart: [] })
      .mockResolvedValueOnce({
        chart: [{ date: '2023-06-30', netPerformance: 300 }]
      });

    const result = await getPerformanceByYear({
      end: parseDate('2023-06-30'),
      portfolioCalculator,
      start: parseDate('2021-03-01')
    });

    expect(mockGetPerformance).toHaveBeenCalledTimes(3);
    expect(result).toHaveLength(2);
    expect(result[0].date).toEqual('2021-01-01');
    expect(result[1].date).toEqual('2023-01-01');
  });

  it('preserves all properties from the last chart entry', async () => {
    const chartEntry: HistoricalDataItem = {
      date: '2023-12-31',
      netPerformance: 100,
      netPerformanceInPercentage: 0.1,
      netPerformanceWithCurrencyEffect: 95,
      netPerformanceInPercentageWithCurrencyEffect: 0.095,
      netWorth: 1000,
      totalInvestment: 900,
      totalInvestmentValueWithCurrencyEffect: 850
    };

    mockGetPerformance.mockResolvedValue({ chart: [chartEntry] });

    const result = await getPerformanceByYear({
      end: parseDate('2023-12-31'),
      portfolioCalculator,
      start: parseDate('2023-01-01')
    });

    expect(result[0]).toEqual({
      ...chartEntry,
      date: '2023-01-01'
    });
  });
});
