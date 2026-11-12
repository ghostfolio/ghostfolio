import { RoaiPortfolioCalculator } from '../../../app/portfolio/calculator/roai/portfolio-calculator';
import { RoiPortfolioCalculator } from '../../../app/portfolio/calculator/roi/portfolio-calculator';
import { evaluateRange, simulateBenchmark } from './activity-matched-benchmark';

describe('upstream historical range parity (no calculator construction)', () => {
  it.each([
    ['ROI', RoiPortfolioCalculator],
    ['ROAI', RoaiPortfolioCalculator]
  ] as const)(
    'matches %s denominators and normalization on identical historical inputs',
    (method, Calculator) => {
      const dates = ['2024-01-01', '2024-01-03', '2024-01-06', '2024-01-07'];
      const points = simulateBenchmark({
        flows: [
          { date: dates[0], amount: '100' },
          { date: dates[1], amount: '-60' },
          { date: dates[2], amount: '90' }
        ],
        prices: dates.map((date, i) => ({ date, price: String(10 + i * 2) })),
        valuationDates: dates
      });
      for (const start of dates) {
        const range = points.filter(({ date }) => date >= start);
        const historicalDataItems = range.map((point) => ({
          date: point.date,
          value: point.value.toNumber(),
          valueWithCurrencyEffect: point.value.toNumber(),
          totalInvestment: point.costBasis.toNumber(),
          totalInvestmentValueWithCurrencyEffect: point.costBasis.toNumber(),
          dividendInBaseCurrency: 0,
          netPerformance: point.netPerformance
            .minus(range[0].netPerformance)
            .toNumber(),
          netPerformanceWithCurrencyEffect: point.netPerformance
            .minus(range[0].netPerformance)
            .toNumber()
        }));
        // Protected pure range method only: no constructor, database, HTTP or snapshot services.
        const upstream = (
          Object.create(Calculator.prototype) as any
        ).calculatePerformancePercentagesForDateRange({ historicalDataItems });
        for (const point of evaluateRange(
          points,
          method,
          start,
          dates.at(-1)
        )) {
          expect(point.returnFraction.toNumber()).toBeCloseTo(
            upstream[point.date].netPerformanceInPercentage,
            12
          );
        }
      }
    }
  );
});
