import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';

import { MarketData } from '@prisma/client';

import { BenchmarkMarketDataProvider } from './benchmark-market-data.provider';
import { prepareBenchmarkPrices } from './benchmark-price.adapter';

function quote({
  date,
  price = 100,
  carriedForward = false,
  state = 'CLOSE'
}: {
  date: string;
  price?: number;
  carriedForward?: boolean;
  state?: MarketData['state'];
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

describe('Benchmark historical MarketData provider', () => {
  const startDate = new Date('2025-01-11T00:00:00Z');
  const endDate = new Date('2025-01-15T00:00:00Z');

  const records = [
    quote({ date: '2025-01-03', price: 90 }),
    quote({ date: '2025-01-10', price: 100 }),
    quote({
      date: '2025-01-11',
      price: 100,
      carriedForward: true
    }),
    quote({
      date: '2025-01-12',
      price: 100,
      carriedForward: true
    }),
    quote({ date: '2025-01-13', price: 105 }),
    quote({ date: '2025-01-14', price: 106, state: 'INTRADAY' }),
    quote({ date: '2025-01-15', price: 110 }),
    quote({ date: '2025-01-16', price: 115 })
  ];

  const marketDataItems = jest.fn();

  const provider = new BenchmarkMarketDataProvider({
    marketDataItems
  } as unknown as MarketDataService);

  beforeEach(() => {
    marketDataItems.mockReset();

    marketDataItems.mockImplementation(async ({ where, orderBy, take }) => {
      const filtered = records.filter((item) => {
        if (item.dataSource !== where.dataSource) return false;
        if (item.symbol !== where.symbol) return false;
        if (item.state !== where.state) return false;
        if (item.isCarriedForward !== where.isCarriedForward) return false;
        if (where.date.lt && !(item.date < where.date.lt)) return false;
        if (where.date.gte && !(item.date >= where.date.gte)) return false;
        if (where.date.lte && !(item.date <= where.date.lte)) return false;
        return true;
      });

      filtered.sort((a, b) =>
        orderBy.date === 'desc'
          ? b.date.getTime() - a.date.getTime()
          : a.date.getTime() - b.date.getTime()
      );

      return take === undefined ? filtered : filtered.slice(0, take);
    });
  });

  const input = {
    dataSource: 'YAHOO' as const,
    symbol: 'SPY',
    startDate,
    endDate
  };

  it('retrieves the latest original quotation before the interval', async () => {
    const result = await provider.getHistoricalPrices(input);

    expect(result.prices[0]).toEqual({
      date: '2025-01-10',
      price: '100'
    });

    expect(result.prices.map(({ date }) => date)).toEqual([
      '2025-01-10',
      '2025-01-13',
      '2025-01-15'
    ]);
  });

  it('filters carried-forward and intraday records in the query', async () => {
    await provider.getHistoricalPrices(input);

    expect(marketDataItems).toHaveBeenCalledTimes(2);

    for (const [query] of marketDataItems.mock.calls) {
      expect(query.where.state).toBe('CLOSE');
      expect(query.where.isCarriedForward).toBe(false);
    }

    expect(marketDataItems.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        orderBy: { date: 'desc' },
        take: 1
      })
    );
  });

  it('preserves the Friday source for a Sunday execution', async () => {
    const result = await provider.getHistoricalPrices(input);

    const prepared = prepareBenchmarkPrices({
      executionDates: ['2025-01-12'],
      prices: result.prices
    });

    expect(prepared.carriedForward).toEqual([
      {
        date: '2025-01-12',
        sourceDate: '2025-01-10',
        ageInDays: 2
      }
    ]);
  });

  it('rejects reversed date ranges without querying the database', async () => {
    await expect(
      provider.getHistoricalPrices({
        ...input,
        startDate: endDate,
        endDate: startDate
      })
    ).rejects.toThrow('Reversed benchmark date range');

    expect(marketDataItems).not.toHaveBeenCalled();
  });

  it('rejects invalid dates without querying the database', async () => {
    await expect(
      provider.getHistoricalPrices({
        ...input,
        startDate: new Date(NaN)
      })
    ).rejects.toThrow('Invalid benchmark date range');

    expect(marketDataItems).not.toHaveBeenCalled();
  });

  it('returns no prices when the database has no records', async () => {
    marketDataItems.mockResolvedValue([]);

    const result = await provider.getHistoricalPrices(input);

    expect(result.prices).toEqual([]);
  });
});
