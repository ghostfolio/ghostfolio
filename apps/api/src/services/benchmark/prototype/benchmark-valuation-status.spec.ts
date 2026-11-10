import { evaluateRange, simulateBenchmark } from './activity-matched-benchmark';
import { prepareBenchmarkPrices } from './benchmark-price.adapter';

const friday = '2025-01-10';
const sunday = '2025-01-12';
const nextFriday = '2025-01-17';
const nextSaturday = '2025-01-18';

describe('Benchmark valuation status', () => {
  it('marks a real same-day quotation as CURRENT', () => {
    const points = simulateBenchmark({
      flows: [{ date: friday, amount: '100' }],
      prices: [{ date: friday, price: '10' }],
      valuationDates: [friday]
    });

    expect(points[0].valuationStatus).toBe('CURRENT');
  });

  it('marks a recent weekend carry-forward as CARRIED_FORWARD', () => {
    const prepared = prepareBenchmarkPrices({
      executionDates: [sunday],
      prices: [{ date: friday, price: '10' }]
    });

    const points = simulateBenchmark({
      flows: [{ date: sunday, amount: '100' }],
      prices: prepared.prices,
      valuationDates: [sunday]
    });

    expect(points.at(-1).valuationStatus).toBe('CARRIED_FORWARD');
  });

  it('marks a stale display-only valuation without changing financial points', () => {
    const points = simulateBenchmark({
      flows: [{ date: friday, amount: '100' }],
      prices: [
        { date: friday, price: '10' },
        { date: '2025-01-20', price: '12' }
      ],
      valuationDates: [friday, nextSaturday, '2025-01-20']
    });

    const stale = points.find(({ date }) => date === nextSaturday);

    expect(stale.displayOnly).toBe(true);
    expect(stale.valuationStatus).toBe('STALE');
    expect(stale.value.toString()).toBe('100');
  });

  it('marks fully liquidated positions as NOT_APPLICABLE', () => {
    const prepared = prepareBenchmarkPrices({
      executionDates: [friday, sunday],
      prices: [{ date: friday, price: '10' }]
    });

    const points = simulateBenchmark({
      flows: [
        { date: friday, amount: '100' },
        { date: sunday, amount: '-100' }
      ],
      prices: prepared.prices,
      valuationDates: [friday, sunday, nextSaturday]
    });

    expect(points.at(-1).units.toString()).toBe('0');
    expect(points.at(-1).valuationStatus).toBe('NOT_APPLICABLE');
  });

  it('preserves ROI and ROAI when display-only dates are added', () => {
    const input = {
      flows: [{ date: friday, amount: '100' }],
      prices: [
        { date: friday, price: '10' },
        { date: '2025-01-20', price: '12' }
      ]
    };

    const sparse = simulateBenchmark({
      ...input,
      valuationDates: [friday, '2025-01-20']
    });

    const dense = simulateBenchmark({
      ...input,
      valuationDates: [friday, sunday, nextFriday, nextSaturday, '2025-01-20']
    });

    for (const method of ['ROI', 'ROAI'] as const) {
      const sparseReturns = evaluateRange(sparse, method, friday, '2025-01-20');

      const denseReturns = evaluateRange(dense, method, friday, '2025-01-20');

      expect(
        denseReturns.map(({ date, returnFraction }) => ({
          date,
          returnFraction: returnFraction.toString()
        }))
      ).toEqual(
        sparseReturns.map(({ date, returnFraction }) => ({
          date,
          returnFraction: returnFraction.toString()
        }))
      );
    }
  });
});
