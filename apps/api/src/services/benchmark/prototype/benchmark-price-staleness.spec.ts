import { evaluateRange, simulateBenchmark } from './activity-matched-benchmark';
import { prepareBenchmarkPrices } from './benchmark-price.adapter';

const friday = '2025-01-10';
const sunday = '2025-01-12';
const nextFriday = '2025-01-17';
const nextSaturday = '2025-01-18';

function simulate({
  flows,
  prices,
  valuationDates
}: {
  flows: { date: string; amount: string }[];
  prices: { date: string; price: string; sourceDate?: string }[];
  valuationDates: string[];
}) {
  return simulateBenchmark({ flows, prices, valuationDates });
}

describe('Benchmark price staleness', () => {
  it('accepts a seven-day-old valuation price', () => {
    const points = simulate({
      flows: [{ date: friday, amount: '100' }],
      prices: [{ date: friday, price: '10' }],
      valuationDates: [friday, nextFriday]
    });

    expect(points.at(-1).value.toString()).toBe('100');
  });

  it('rejects an eight-day-old price on a financial date', () => {
    expect(() =>
      simulate({
        flows: [
          { date: friday, amount: '100' },
          { date: nextSaturday, amount: '10' }
        ],
        prices: [
          { date: friday, price: '10' },
          {
            date: nextSaturday,
            price: '10',
            sourceDate: friday
          }
        ],
        valuationDates: [friday, nextSaturday]
      })
    ).toThrow('Stale execution price: 2025-01-18');
  });

  it('never resets quote age through synthetic execution prices', () => {
    expect(() =>
      prepareBenchmarkPrices({
        executionDates: [sunday, nextSaturday],
        prices: [{ date: friday, price: '10' }]
      })
    ).toThrow('Stale execution price: 2025-01-18');
  });

  it('rejects stale execution prices even when selling all units', () => {
    expect(() =>
      simulate({
        flows: [
          { date: friday, amount: '100' },
          { date: nextSaturday, amount: '-100' }
        ],
        prices: [
          { date: friday, price: '10' },
          {
            date: nextSaturday,
            price: '10',
            sourceDate: friday
          }
        ],
        valuationDates: [friday, nextSaturday]
      })
    ).toThrow('Stale execution price: 2025-01-18');
  });

  it('rejects stale valuation without a new execution', () => {
    expect(() =>
      simulate({
        flows: [{ date: friday, amount: '100' }],
        prices: [
          { date: friday, price: '10' },
          {
            date: nextSaturday,
            price: '10',
            sourceDate: friday
          }
        ],
        valuationDates: [friday, nextSaturday]
      })
    ).toThrow('Stale valuation price: 2025-01-18');
  });

  it('does not require a fresh valuation after full liquidation', () => {
    const points = simulate({
      flows: [
        { date: friday, amount: '100' },
        { date: sunday, amount: '-100' }
      ],
      prices: [
        { date: friday, price: '10' },
        { date: sunday, price: '10', sourceDate: friday }
      ],
      valuationDates: [friday, sunday, nextSaturday]
    });

    expect(points.at(-1).units.toString()).toBe('0');
    expect(points.at(-1).value.toString()).toBe('0');
  });

  it('does not change financial returns when adding display dates', () => {
    const input = {
      flows: [{ date: friday, amount: '100' }],
      prices: [
        { date: friday, price: '10' },
        { date: nextFriday, price: '12' }
      ]
    };

    const sparse = simulate({
      ...input,
      valuationDates: [friday, nextFriday]
    });

    const dense = simulate({
      ...input,
      valuationDates: [
        friday,
        sunday,
        '2025-01-13',
        '2025-01-14',
        '2025-01-15',
        '2025-01-16',
        nextFriday
      ]
    });

    for (const method of ['ROI', 'ROAI'] as const) {
      const sparseResult = evaluateRange(sparse, method, friday, nextFriday);

      const denseResult = evaluateRange(dense, method, friday, nextFriday);

      expect(denseResult.at(-1).returnFraction.toString()).toBe(
        sparseResult.at(-1).returnFraction.toString()
      );
    }
  });
});
