import { performance } from 'node:perf_hooks';

import {
  evaluateRange,
  normalizeBenchmarkInput,
  simulateNormalizedBenchmark
} from './activity-matched-benchmark';

/** Opt-in deterministic workload. Timing is observational, never a flaky gate. */
(process.env.BENCHMARK_PERFORMANCE ? describe : describe.skip)(
  'benchmark stage profiling',
  () => {
    it('profiles normalization, simulation, each method, combined evaluation and total', () => {
      const rows = [];
      const date = (i: number) =>
        new Date(Date.UTC(2000, 0, 1 + i)).toISOString().slice(0, 10);
      const startDate = date(0);
      const endDate = date(9999);
      for (const count of [500, 2000, 10000]) {
        for (const chartLength of [100, 1000, 10000]) {
          const prices = Array.from({ length: 10000 }, (_, i) => ({
            date: date(i),
            price: String(100 + (i % 17))
          }));
          const flows = Array.from({ length: count }, (_, i) => ({
            date: date(Math.floor((i * 9999) / Math.max(1, count - 1))),
            amount: i % 5 === 4 ? '-1' : '10'
          }));
          const valuationDates = Array.from({ length: chartLength }, (_, i) =>
            date(Math.floor((i * 9999) / (chartLength - 1)))
          );
          const execute = () => {
            const t0 = performance.now();
            const normalized = normalizeBenchmarkInput({
              flows,
              prices,
              valuationDates
            });
            const t1 = performance.now();
            const points = simulateNormalizedBenchmark(normalized);
            const t2 = performance.now();
            const roi = evaluateRange(points, 'ROI', startDate, endDate);
            const t3 = performance.now();
            const roai = evaluateRange(points, 'ROAI', startDate, endDate);
            const t4 = performance.now();
            // Assertions are deliberately outside the timed region.
            expect(roi.length).toBe(points.length);
            expect(Number.isFinite(roai.at(-1).returnFraction.toNumber())).toBe(
              true
            );
            return {
              normalize: t1 - t0,
              simulate: t2 - t1,
              roi: t3 - t2,
              roai: t4 - t3,
              combined: t4 - t2,
              total: t4 - t0
            };
          };
          execute();
          const samples = Array.from({ length: 7 }, execute);
          const metrics = {};
          for (const key of [
            'normalize',
            'simulate',
            'roi',
            'roai',
            'combined',
            'total'
          ] as const) {
            const sorted = samples
              .map((sample) => sample[key])
              .sort((a, b) => a - b);
            metrics[key] = [
              Number(sorted[3].toFixed(2)),
              Number(sorted[6].toFixed(2))
            ];
          }
          rows.push({
            events: count,
            valuationDates: chartLength,
            points: 10000,
            ...metrics
          });
        }
      }
      console.log(
        JSON.stringify({
          label: process.env.PROFILE_LABEL ?? 'current',
          units: 'ms [median,p95]',
          warmups: 1,
          repeats: 7,
          rows
        })
      );
    }, 120000);
  }
);
