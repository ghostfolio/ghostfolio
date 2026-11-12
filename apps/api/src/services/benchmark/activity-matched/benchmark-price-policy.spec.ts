import { simulateBenchmark } from './activity-matched-benchmark';
import {
  DEFAULT_MAX_PRICE_AGE_DAYS,
  validateMaxPriceAgeDays
} from './benchmark-price-policy';
import { prepareBenchmarkPrices } from './benchmark-price.adapter';

const firstDate = '2025-01-10';

function dateAfter(days: number): string {
  const date = new Date('2025-01-10T00:00:00Z');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

describe('Benchmark price age policy', () => {
  it('defaults to seven calendar days', () => {
    expect(DEFAULT_MAX_PRICE_AGE_DAYS).toBe(7);
  });

  it.each([
    [0, 0, true],
    [0, 1, false],
    [3, 2, true],
    [3, 4, false],
    [7, 7, true],
    [7, 8, false],
    [10, 8, true]
  ])('adapter: limit %i, age %i, accepted %s', (limit, age, accepted) => {
    const execute = () =>
      prepareBenchmarkPrices({
        executionDates: [dateAfter(age)],
        maxExecutionAgeDays: limit,
        prices: [{ date: firstDate, price: '10' }]
      });

    if (accepted) {
      expect(execute).not.toThrow();
    } else {
      expect(execute).toThrow('Stale execution price');
    }
  });

  it.each([
    [0, 0, true],
    [0, 1, false],
    [3, 2, true],
    [3, 4, false],
    [7, 7, true],
    [7, 8, false],
    [10, 8, true]
  ])('simulator: limit %i, age %i, accepted %s', (limit, age, accepted) => {
    const executionDate = dateAfter(age);

    const execute = () =>
      simulateBenchmark({
        flows: [{ date: executionDate, amount: '100' }],
        maxPriceAgeDays: limit,
        prices: [
          { date: firstDate, price: '10' },
          ...(age > 0
            ? [
                {
                  date: executionDate,
                  price: '10',
                  sourceDate: firstDate
                }
              ]
            : [])
        ],
        valuationDates: [executionDate]
      });

    if (accepted) {
      expect(execute).not.toThrow();
    } else {
      expect(execute).toThrow('Stale execution price');
    }
  });

  it.each([-1, 1.5, NaN, Infinity, -Infinity])(
    'rejects invalid limit %s in both components',
    (limit) => {
      expect(() => validateMaxPriceAgeDays(limit)).toThrow(
        'Invalid maximum price age'
      );

      expect(() =>
        prepareBenchmarkPrices({
          executionDates: [],
          maxExecutionAgeDays: limit,
          prices: []
        })
      ).toThrow('Invalid maximum price age');

      expect(() =>
        simulateBenchmark({
          flows: [],
          maxPriceAgeDays: limit,
          prices: [],
          valuationDates: []
        })
      ).toThrow('Invalid maximum price age');
    }
  );
});
