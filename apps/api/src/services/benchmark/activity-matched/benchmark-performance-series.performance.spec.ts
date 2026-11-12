import { performance } from 'node:perf_hooks';

import { simulateBenchmark } from './activity-matched-benchmark';
import { createBenchmarkDisplayValuations } from './benchmark-display-valuation.adapter';
import { composeBenchmarkPerformanceSeries } from './benchmark-performance-series.adapter';

const date = (day: number) =>
  new Date(Date.UTC(2000, 0, day + 1)).toISOString().slice(0, 10);

(process.env.BENCHMARK_PERFORMANCE ? describe : describe.skip)(
  'Benchmark performance series profiling',
  () => {
    it('profiles mixed financial/display dates with changing invested capital', () => {
      const rows = [];
      for (const count of [365, 1825, 3650]) {
        const valuationDates = Array.from({ length: count }, (_, i) => date(i));
        const prices = valuationDates
          .filter((_, i) => i % 5 === 0)
          .map((date) => ({ date, price: '100' }));
        const points = simulateBenchmark({
          flows: valuationDates
            .filter((_, i) => i % 100 === 0)
            .map((date) => ({ date, amount: '100' })),
          prices,
          valuationDates
        });
        const displayValuations = createBenchmarkDisplayValuations({
          points,
          prices,
          fxQuotes: [],
          currencyFrom: 'EUR',
          currencyTo: 'EUR'
        });
        for (const method of ['ROI', 'ROAI'] as const) {
          const execute = () => {
            const start = performance.now();
            const result = composeBenchmarkPerformanceSeries({
              points,
              displayValuations,
              valuationDates,
              financialCurrency: 'EUR',
              start: valuationDates[0],
              end: valuationDates[count - 1],
              method
            });
            return { elapsed: performance.now() - start, result };
          };
          execute();
          const samples = Array.from({ length: 7 }, execute);
          for (const { result } of samples) {
            expect(result.map(({ date }) => date)).toEqual(valuationDates);
            expect(result.every(({ value }) => value === 0)).toBe(true);
          }
          const sorted = samples
            .map(({ elapsed }) => elapsed)
            .sort((a, b) => a - b);
          rows.push({
            dates: count,
            method,
            median: Number(sorted[3].toFixed(2)),
            p95: Number(sorted[6].toFixed(2))
          });
        }
      }
      console.log(
        JSON.stringify({ units: 'ms', warmups: 1, repetitions: 7, rows })
      );
    });
  }
);
