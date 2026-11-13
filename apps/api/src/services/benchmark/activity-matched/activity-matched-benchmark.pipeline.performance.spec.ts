import { Activity } from '@ghostfolio/common/interfaces';
import { AssetSubClass } from '@ghostfolio/prisma/browser';

import { performance } from 'node:perf_hooks';

import { createActivityFunding } from './activity-cash-flow.provider';
import {
  evaluateRange,
  normalizeBenchmarkInput,
  simulateNormalizedBenchmark
} from './activity-matched-benchmark';
import { prepareBenchmarkPrices } from './benchmark-price.adapter';

const date = (i: number): string =>
  new Date(Date.UTC(2000, 0, 1 + i)).toISOString().slice(0, 10);

const startDate = date(0);
const endDate = date(9999);

function createActivities(count: number): Activity[] {
  return Array.from({ length: count }, (_, i) => {
    const isSell = i % 5 === 4;
    const dayIndex = Math.floor((i * 9999) / Math.max(1, count - 1));

    return {
      id: `activity-${i}`,
      type: isSell ? 'SELL' : 'BUY',
      date: new Date(`${date(dayIndex)}T12:00:00Z`),
      valueInBaseCurrency: isSell ? 1 : 100,
      assetProfile: {
        assetSubClass: AssetSubClass.ETF
      }
    } as Activity;
  });
}

function createMarketPrices() {
  const previousClose = {
    date: '1999-12-31',
    price: '100'
  };

  return [
    previousClose,
    ...Array.from({ length: 10000 }, (_, i) => i)
      .filter((i) => {
        const weekday = new Date(`${date(i)}T00:00:00Z`).getUTCDay();
        return weekday !== 0 && weekday !== 6;
      })
      .map((i) => ({
        date: date(i),
        price: String(100 + (i % 17))
      }))
  ];
}

function percentileMetrics(samples: number[]) {
  const sorted = [...samples].sort((a, b) => a - b);

  return [Number(sorted[3].toFixed(2)), Number(sorted[6].toFixed(2))];
}

(process.env.BENCHMARK_PERFORMANCE ? describe : describe.skip)(
  'activity-matched benchmark pipeline profiling',
  () => {
    it('profiles the complete isolated pipeline', () => {
      const rows = [];
      const marketPrices = createMarketPrices();

      for (const count of [500, 2000, 10000]) {
        const activities = createActivities(count);

        for (const chartLength of [100, 1000, 10000]) {
          const valuationDates = Array.from({ length: chartLength }, (_, i) =>
            date(Math.floor((i * 9999) / (chartLength - 1)))
          );

          const execute = () => {
            const t0 = performance.now();

            const funding = createActivityFunding({
              activities,
              currency: 'EUR'
            });

            const t1 = performance.now();

            if (!funding.canSimulate) {
              throw new Error('Invalid funding activities');
            }

            const prepared = prepareBenchmarkPrices({
              executionDates: funding.flows.map(({ date }) => date),
              prices: marketPrices
            });

            const t2 = performance.now();

            const normalized = normalizeBenchmarkInput({
              flows: funding.flows,
              prices: prepared.prices,
              valuationDates
            });

            const t3 = performance.now();

            const points = simulateNormalizedBenchmark(normalized);

            const t4 = performance.now();

            const roi = evaluateRange(points, 'ROI', startDate, endDate);

            const t5 = performance.now();

            const roai = evaluateRange(points, 'ROAI', startDate, endDate);

            const t6 = performance.now();

            // Assertions are deliberately outside timed stages.
            const expectedDates = points
              .filter(
                ({ date, displayOnly }) =>
                  !displayOnly && date >= startDate && date <= endDate
              )
              .map(({ date }) => date);

            expect(funding.events).toHaveLength(count);
            expect(roi.map(({ date }) => date)).toEqual(expectedDates);
            expect(roai.map(({ date }) => date)).toEqual(expectedDates);
            expect(Number.isFinite(roai.at(-1).returnFraction.toNumber())).toBe(
              true
            );

            return {
              provider: t1 - t0,
              adapter: t2 - t1,
              normalize: t3 - t2,
              simulate: t4 - t3,
              roi: t5 - t4,
              roai: t6 - t5,
              total: t6 - t0,
              points: points.length,
              carriedForward: prepared.carriedForward.length
            };
          };

          execute();

          const samples = Array.from({ length: 7 }, execute);

          const metrics = {};

          for (const key of [
            'provider',
            'adapter',
            'normalize',
            'simulate',
            'roi',
            'roai',
            'total'
          ] as const) {
            metrics[key] = percentileMetrics(
              samples.map((sample) => sample[key])
            );
          }

          rows.push({
            activities: count,
            valuationDates: chartLength,
            points: samples[0].points,
            carriedForward: samples[0].carriedForward,
            ...metrics
          });
        }
      }

      console.log(
        JSON.stringify({
          label: process.env.PROFILE_LABEL ?? 'pipeline',
          units: 'ms [median,p95]',
          warmups: 1,
          repeats: 7,
          rows
        })
      );
    }, 120000);
  }
);
