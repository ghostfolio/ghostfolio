import { MarketData } from '@prisma/client';

import { adaptBenchmarkMarketData } from './benchmark-market-data.adapter';
import { prepareBenchmarkPrices } from './benchmark-price.adapter';

function quote({
  date,
  price = 100,
  carriedForward = false
}: {
  date: string;
  price?: number;
  carriedForward?: boolean;
}): MarketData {
  return {
    id: `quote-${date}`,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    dataSource: 'YAHOO',
    symbol: 'SPY',
    date: new Date(`${date}T00:00:00Z`),
    marketPrice: price,
    isCarriedForward: carriedForward,
    state: 'CLOSE'
  };
}

describe('Benchmark MarketData provenance integration', () => {
  it('preserves Friday as the source of a Sunday execution', () => {
    const adapted = adaptBenchmarkMarketData({
      marketData: [
        quote({ date: '2025-01-10' }),
        quote({
          date: '2025-01-11',
          carriedForward: true
        }),
        quote({
          date: '2025-01-12',
          carriedForward: true
        })
      ]
    });

    expect(adapted.prices).toEqual([{ date: '2025-01-10', price: '100' }]);

    const prepared = prepareBenchmarkPrices({
      executionDates: ['2025-01-12'],
      prices: adapted.prices
    });

    expect(prepared.carriedForward).toEqual([
      {
        date: '2025-01-12',
        sourceDate: '2025-01-10',
        ageInDays: 2
      }
    ]);

    expect(prepared.prices).toContainEqual({
      date: '2025-01-12',
      price: '100',
      sourceDate: '2025-01-10'
    });
  });

  it('rejects an execution eight days after the last original quote', () => {
    const adapted = adaptBenchmarkMarketData({
      marketData: [
        quote({ date: '2025-01-10' }),
        ...Array.from({ length: 8 }, (_, index) =>
          quote({
            date: `2025-01-${String(index + 11).padStart(2, '0')}`,
            carriedForward: true
          })
        )
      ]
    });

    expect(adapted.excludedCarriedForward).toBe(8);

    expect(() =>
      prepareBenchmarkPrices({
        executionDates: ['2025-01-18'],
        prices: adapted.prices
      })
    ).toThrow('Stale execution price: 2025-01-18');
  });

  it('never uses a future original quote for an earlier execution', () => {
    const adapted = adaptBenchmarkMarketData({
      marketData: [quote({ date: '2025-01-13', price: 105 })]
    });

    expect(() =>
      prepareBenchmarkPrices({
        executionDates: ['2025-01-12'],
        prices: adapted.prices
      })
    ).toThrow('Missing historical price: 2025-01-12');
  });
});
