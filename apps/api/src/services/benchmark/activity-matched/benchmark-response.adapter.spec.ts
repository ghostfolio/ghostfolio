import { Big } from 'big.js';

import { toBenchmarkMarketData } from './benchmark-response.adapter';

describe('Benchmark response adapter', () => {
  function makePerformance(values: { date: string; returnFraction: string }[]) {
    return values.map(({ date, returnFraction }) => ({
      date,
      returnFraction: new Big(returnFraction),
      capital: new Big(100),
      netPerformance: new Big(0)
    }));
  }

  it('converts positive returns to percentages', () => {
    expect(
      toBenchmarkMarketData(
        makePerformance([{ date: '2025-01-01', returnFraction: '0.125' }])
      )
    ).toEqual([{ date: '2025-01-01', value: 12.5 }]);
  });

  it('converts negative returns to percentages', () => {
    expect(
      toBenchmarkMarketData(
        makePerformance([{ date: '2025-01-01', returnFraction: '-0.08' }])
      )
    ).toEqual([{ date: '2025-01-01', value: -8 }]);
  });

  it('preserves zero returns', () => {
    expect(
      toBenchmarkMarketData(
        makePerformance([{ date: '2025-01-01', returnFraction: '0' }])
      )
    ).toEqual([{ date: '2025-01-01', value: 0 }]);
  });

  it('preserves the input date order', () => {
    expect(
      toBenchmarkMarketData(
        makePerformance([
          { date: '2025-01-03', returnFraction: '0.3' },
          { date: '2025-01-01', returnFraction: '0.1' },
          { date: '2025-01-02', returnFraction: '0.2' }
        ])
      )
    ).toEqual([
      { date: '2025-01-03', value: 30 },
      { date: '2025-01-01', value: 10 },
      { date: '2025-01-02', value: 20 }
    ]);
  });

  it('returns an empty array for empty input', () => {
    expect(toBenchmarkMarketData([])).toEqual([]);
  });

  it('rejects a return outside finite number range', () => {
    expect(() =>
      toBenchmarkMarketData(
        makePerformance([{ date: '2025-01-01', returnFraction: '1e1000' }])
      )
    ).toThrow('Invalid benchmark return: 2025-01-01');
  });
});
