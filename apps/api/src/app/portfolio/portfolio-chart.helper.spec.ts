import { HistoricalDataItem } from '@ghostfolio/common/interfaces';

import { getChartByYear } from './portfolio-chart.helper';

describe('portfolio-chart.helper', () => {
  describe('getChartByYear', () => {
    it('returns empty array for empty input', () => {
      expect(getChartByYear([])).toEqual([]);
    });

    it('returns empty array for null input', () => {
      expect(getChartByYear(null)).toEqual([]);
    });

    it('returns empty array for undefined input', () => {
      expect(getChartByYear(undefined)).toEqual([]);
    });

    it('groups data by year with normalized dates (YYYY-01-01)', () => {
      const chart: HistoricalDataItem[] = [
        { date: '2023-03-15', netPerformance: 100, netWorth: 1000 },
        { date: '2023-06-20', netPerformance: 150, netWorth: 1100 },
        { date: '2023-12-31', netPerformance: 200, netWorth: 1200 },
        { date: '2024-01-15', netPerformance: 180, netWorth: 1150 },
        { date: '2024-06-30', netPerformance: 250, netWorth: 1300 }
      ];

      const result = getChartByYear(chart);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        date: '2023-01-01',
        netPerformance: 200,
        netWorth: 1200
      });
      expect(result[1]).toEqual({
        date: '2024-01-01',
        netPerformance: 250,
        netWorth: 1300
      });
    });

    it('uses last data point of each year as representative value', () => {
      const chart: HistoricalDataItem[] = [
        { date: '2022-01-01', netPerformance: 10, netWorth: 100 },
        { date: '2022-02-01', netPerformance: 20, netWorth: 110 },
        { date: '2022-03-01', netPerformance: 30, netWorth: 120 }
      ];

      const result = getChartByYear(chart);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        date: '2022-01-01',
        netPerformance: 30,
        netWorth: 120
      });
    });

    it('handles single data point', () => {
      const chart: HistoricalDataItem[] = [
        { date: '2025-07-15', netPerformance: 500, netWorth: 5000 }
      ];

      const result = getChartByYear(chart);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        date: '2025-01-01',
        netPerformance: 500,
        netWorth: 5000
      });
    });

    it('handles data spanning multiple years', () => {
      const chart: HistoricalDataItem[] = [
        { date: '2020-06-01', netWorth: 100 },
        { date: '2021-06-01', netWorth: 200 },
        { date: '2022-06-01', netWorth: 300 },
        { date: '2023-06-01', netWorth: 400 },
        { date: '2024-06-01', netWorth: 500 }
      ];

      const result = getChartByYear(chart);

      expect(result).toHaveLength(5);
      expect(result.map((r) => r.date)).toEqual([
        '2020-01-01',
        '2021-01-01',
        '2022-01-01',
        '2023-01-01',
        '2024-01-01'
      ]);
      expect(result.map((r) => r.netWorth)).toEqual([100, 200, 300, 400, 500]);
    });

    it('preserves all properties from the data point', () => {
      const chart: HistoricalDataItem[] = [
        {
          date: '2023-12-31',
          netPerformance: 100,
          netPerformanceInPercentage: 0.1,
          netPerformanceWithCurrencyEffect: 95,
          netPerformanceInPercentageWithCurrencyEffect: 0.095,
          netWorth: 1000,
          totalInvestment: 900,
          investmentValueWithCurrencyEffect: 850
        }
      ];

      const result = getChartByYear(chart);

      expect(result[0]).toEqual({
        date: '2023-01-01',
        netPerformance: 100,
        netPerformanceInPercentage: 0.1,
        netPerformanceWithCurrencyEffect: 95,
        netPerformanceInPercentageWithCurrencyEffect: 0.095,
        netWorth: 1000,
        totalInvestment: 900,
        investmentValueWithCurrencyEffect: 850
      });
    });
  });
});
