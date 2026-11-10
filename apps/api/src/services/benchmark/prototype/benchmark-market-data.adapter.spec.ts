import { MarketData } from '@prisma/client';

import { adaptBenchmarkMarketData } from './benchmark-market-data.adapter';

function marketData({
  date,
  price = 100,
  carriedForward = false,
  state = 'CLOSE'
}: {
  date: string;
  price?: number;
  carriedForward?: boolean;
  state?: 'CLOSE' | 'INTRADAY';
}): MarketData {
  return {
    id: `quote-${date}`,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    dataSource: 'YAHOO',
    symbol: 'SPY',
    date: new Date(`${date}T00:00:00Z`),
    marketPrice: price,
    isCarriedForward: carriedForward,
    state
  };
}

describe('Benchmark MarketData adapter', () => {
  it('keeps original CLOSE prices in chronological order', () => {
    const result = adaptBenchmarkMarketData({
      marketData: [
        marketData({ date: '2025-01-13', price: 102 }),
        marketData({ date: '2025-01-10', price: 100 })
      ]
    });

    expect(result.prices).toEqual([
      { date: '2025-01-10', price: '100' },
      { date: '2025-01-13', price: '102' }
    ]);
    expect(result.excludedCarriedForward).toBe(0);
    expect(result.excludedIntraday).toBe(0);
  });

  it('excludes carried-forward records', () => {
    const result = adaptBenchmarkMarketData({
      marketData: [
        marketData({ date: '2025-01-10', price: 100 }),
        marketData({
          date: '2025-01-11',
          price: 100,
          carriedForward: true
        }),
        marketData({
          date: '2025-01-12',
          price: 100,
          carriedForward: true
        })
      ]
    });

    expect(result.prices).toEqual([{ date: '2025-01-10', price: '100' }]);
    expect(result.excludedCarriedForward).toBe(2);
  });

  it('excludes INTRADAY quotations', () => {
    const result = adaptBenchmarkMarketData({
      marketData: [
        marketData({ date: '2025-01-10' }),
        marketData({
          date: '2025-01-13',
          price: 110,
          state: 'INTRADAY'
        })
      ]
    });

    expect(result.prices).toHaveLength(1);
    expect(result.excludedIntraday).toBe(1);
  });

  it('preserves unchanged genuine CLOSE prices', () => {
    const result = adaptBenchmarkMarketData({
      marketData: [
        marketData({ date: '2025-01-10', price: 100 }),
        marketData({ date: '2025-01-13', price: 100 })
      ]
    });

    expect(result.prices).toHaveLength(2);
  });

  it.each([0, -1, NaN, Infinity, -Infinity])(
    'rejects invalid original price %s',
    (price) => {
      expect(() =>
        adaptBenchmarkMarketData({
          marketData: [marketData({ date: '2025-01-10', price })]
        })
      ).toThrow('Invalid benchmark market price');
    }
  );

  it('rejects an invalid Date object', () => {
    const record = marketData({ date: '2025-01-10' });
    record.date = new Date(NaN);

    expect(() => adaptBenchmarkMarketData({ marketData: [record] })).toThrow(
      'Invalid benchmark market date'
    );
  });

  it('rejects a non-Date value', () => {
    const record = marketData({ date: '2025-01-10' });

    const invalidRecord = {
      ...record,
      date: '2025-01-10'
    } as unknown as MarketData;

    expect(() =>
      adaptBenchmarkMarketData({ marketData: [invalidRecord] })
    ).toThrow('Invalid benchmark market date');
  });

  it('rejects duplicate original dates', () => {
    expect(() =>
      adaptBenchmarkMarketData({
        marketData: [
          marketData({ date: '2025-01-10', price: 100 }),
          marketData({ date: '2025-01-10', price: 101 })
        ]
      })
    ).toThrow('Duplicate benchmark price');
  });

  it('returns no original prices when all records are carried forward', () => {
    const result = adaptBenchmarkMarketData({
      marketData: [
        marketData({
          date: '2025-01-11',
          carriedForward: true
        }),
        marketData({
          date: '2025-01-12',
          carriedForward: true
        })
      ]
    });

    expect(result.prices).toEqual([]);
    expect(result.excludedCarriedForward).toBe(2);
  });

  it('does not mutate input records or their order', () => {
    const records = [
      marketData({ date: '2025-01-13', price: 102 }),
      marketData({ date: '2025-01-10', price: 100 })
    ];

    const original = records.map(({ date, marketPrice }) => ({
      date: date.toISOString(),
      marketPrice
    }));

    adaptBenchmarkMarketData({ marketData: records });

    expect(
      records.map(({ date, marketPrice }) => ({
        date: date.toISOString(),
        marketPrice
      }))
    ).toEqual(original);
  });
});
