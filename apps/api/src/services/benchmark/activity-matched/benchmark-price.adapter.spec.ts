import { prepareBenchmarkPrices } from './benchmark-price.adapter';

describe('Benchmark price adapter', () => {
  it('preserves exact execution prices', () => {
    const result = prepareBenchmarkPrices({
      executionDates: ['2025-01-10'],
      prices: [{ date: '2025-01-10', price: '100' }]
    });

    expect(result.prices).toEqual([{ date: '2025-01-10', price: '100' }]);
    expect(result.carriedForward).toEqual([]);
  });

  it('uses Friday close for a Sunday execution', () => {
    const result = prepareBenchmarkPrices({
      executionDates: ['2025-01-12'],
      prices: [
        { date: '2025-01-10', price: '100' },
        { date: '2025-01-13', price: '110' }
      ]
    });

    expect(result.prices).toEqual([
      { date: '2025-01-10', price: '100' },
      {
        date: '2025-01-12',
        price: '100',
        sourceDate: '2025-01-10'
      },
      { date: '2025-01-13', price: '110' }
    ]);

    expect(result.carriedForward).toEqual([
      {
        date: '2025-01-12',
        sourceDate: '2025-01-10',
        ageInDays: 2
      }
    ]);
  });

  it('accepts the maximum price age of seven days', () => {
    const result = prepareBenchmarkPrices({
      executionDates: ['2025-01-17'],
      prices: [{ date: '2025-01-10', price: '100' }]
    });

    expect(result.carriedForward[0].ageInDays).toBe(7);
  });

  it('rejects prices older than seven days', () => {
    expect(() =>
      prepareBenchmarkPrices({
        executionDates: ['2025-01-18'],
        prices: [{ date: '2025-01-10', price: '100' }]
      })
    ).toThrow('Stale execution price: 2025-01-18');
  });

  it('never uses a future price', () => {
    expect(() =>
      prepareBenchmarkPrices({
        executionDates: ['2025-01-12'],
        prices: [{ date: '2025-01-13', price: '110' }]
      })
    ).toThrow('Missing historical price: 2025-01-12');
  });

  it('rejects duplicate price dates', () => {
    expect(() =>
      prepareBenchmarkPrices({
        executionDates: [],
        prices: [
          { date: '2025-01-10', price: '100' },
          { date: '2025-01-10', price: '101' }
        ]
      })
    ).toThrow('Duplicate benchmark price: 2025-01-10');
  });

  it.each(['0', '-1', 'invalid'])('rejects invalid price %s', (price) => {
    expect(() =>
      prepareBenchmarkPrices({
        executionDates: [],
        prices: [{ date: '2025-01-10', price }]
      })
    ).toThrow();
  });

  it('does not mutate the original inputs', () => {
    const prices = [
      { date: '2025-01-13', price: '110' },
      { date: '2025-01-10', price: '100' }
    ];
    const executionDates = ['2025-01-12'];

    const originalPrices = structuredClone(prices);
    const originalDates = [...executionDates];

    prepareBenchmarkPrices({ executionDates, prices });

    expect(prices).toEqual(originalPrices);
    expect(executionDates).toEqual(originalDates);
  });
});
