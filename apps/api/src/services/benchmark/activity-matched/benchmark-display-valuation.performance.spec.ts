import { Big } from 'big.js';
import { performance } from 'node:perf_hooks';

import { FinancialPoint } from './activity-matched-benchmark';
import { createBenchmarkDisplayValuations } from './benchmark-display-valuation.adapter';

const date = (day: number): string =>
  new Date(Date.UTC(2000, 0, 1 + day)).toISOString().slice(0, 10);

function percentileMetrics(samples: number[]) {
  const sorted = [...samples].sort((a, b) => a - b);

  return [Number(sorted[3].toFixed(2)), Number(sorted[6].toFixed(2))];
}

(process.env.BENCHMARK_PERFORMANCE ? describe : describe.skip)(
  'benchmark display FX profiling',
  () => {
    it('profiles historical display valuations', () => {
      const rows = [];

      for (const count of [365, 1825, 3650]) {
        const points = Array.from({ length: count }, (_, i) => ({
          date: date(i),
          displayOnly: true,
          units: new Big(1)
        })) as FinancialPoint[];

        const prices = Array.from({ length: count }, (_, i) => ({
          date: date(i),
          price: String(100 + (i % 17))
        }));

        const fxQuotes = Array.from({ length: count }, (_, i) => ({
          currencyFrom: 'USD',
          currencyTo: 'EUR',
          date: date(i),
          rate: String(0.9 + (i % 10) / 100)
        }));

        const execute = () => {
          const start = performance.now();

          const result = createBenchmarkDisplayValuations({
            points,
            prices,
            fxQuotes,
            currencyFrom: 'USD',
            currencyTo: 'EUR'
          });

          const elapsed = performance.now() - start;

          return { elapsed, result };
        };

        execute();

        const samples = Array.from({ length: 7 }, execute);

        const expected = samples[0].result;

        expect(expected).toHaveLength(count);

        expected.forEach((valuation, i) => {
          expect(valuation).toMatchObject({
            date: date(i),
            value: new Big(prices[i].price).mul(fxQuotes[i].rate).toString(),
            benchmarkPriceSourceDate: date(i),
            fxSourceDate: date(i),
            valuationStatus: 'CURRENT'
          });
        });

        for (const sample of samples) {
          expect(sample.result).toEqual(expected);
        }

        rows.push({
          displayDates: count,
          fxQuotes: fxQuotes.length,
          benchmarkPrices: prices.length,
          total: percentileMetrics(samples.map(({ elapsed }) => elapsed))
        });
      }

      console.log(
        JSON.stringify({
          label: process.env.PROFILE_LABEL ?? 'display-fx-baseline',
          units: 'ms [median,p95]',
          warmups: 1,
          repeats: 7,
          rows
        })
      );
    });
  }
);
