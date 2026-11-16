import {
  getBaselinePrice,
  getInstrumentIntradayItems,
  getIntradayGrid,
  getIntradaySessions,
  getPortfolioIntradayItems,
  getPriceAt,
  IntradayInstrument,
  isAnyMarketOpen
} from './intraday.helper';

const MINUTE = 60 * 1000;
const time = (aIso: string) => {
  return Date.parse(aIso);
};

// Thursday, 22 October 2026
const europe: IntradayInstrument = {
  prices: [
    { price: 100, time: time('2026-10-21T15:29:00Z') },
    { price: 101, time: time('2026-10-22T07:00:00Z') },
    { price: 102, time: time('2026-10-22T08:00:00Z') }
  ],
  tradingPeriods: [
    {
      end: time('2026-10-21T15:30:00Z'),
      start: time('2026-10-21T07:00:00Z'),
      type: 'regular'
    },
    {
      end: time('2026-10-22T15:30:00Z'),
      start: time('2026-10-22T07:00:00Z'),
      type: 'regular'
    }
  ]
};

const unitedStates: IntradayInstrument = {
  prices: [
    { price: 50, time: time('2026-10-21T19:59:00Z') },
    // Post-market of the previous day
    { price: 55, time: time('2026-10-21T23:00:00Z') },
    // Pre-market
    { price: 51, time: time('2026-10-22T08:30:00Z') }
  ],
  tradingPeriods: [
    {
      end: time('2026-10-21T20:00:00Z'),
      start: time('2026-10-21T13:30:00Z'),
      type: 'regular'
    },
    {
      end: time('2026-10-22T00:00:00Z'),
      start: time('2026-10-21T20:00:00Z'),
      type: 'post'
    },
    {
      end: time('2026-10-22T13:30:00Z'),
      start: time('2026-10-22T08:00:00Z'),
      type: 'pre'
    },
    {
      end: time('2026-10-22T20:00:00Z'),
      start: time('2026-10-22T13:30:00Z'),
      type: 'regular'
    },
    {
      end: time('2026-10-23T00:00:00Z'),
      start: time('2026-10-22T20:00:00Z'),
      type: 'post'
    }
  ]
};

describe('intraday helper', () => {
  const now = time('2026-10-22T09:00:00Z');

  it('spans the trading sessions of the day including the pre-market and the post-market', () => {
    expect(
      getIntradaySessions({
        now,
        dateRange: '1d',
        instruments: [europe, unitedStates]
      })
    ).toEqual([
      {
        end: time('2026-10-23T00:00:00Z'),
        start: time('2026-10-22T07:00:00Z')
      }
    ]);
  });

  it('uses the previous trading day before the first session has started', () => {
    expect(
      getIntradaySessions({
        dateRange: '1d',
        instruments: [europe],
        now: time('2026-10-22T05:00:00Z')
      })
    ).toEqual([
      {
        end: time('2026-10-21T15:30:00Z'),
        start: time('2026-10-21T07:00:00Z')
      }
    ]);
  });

  it('spans the trading sessions of the whole week', () => {
    const sessions = getIntradaySessions({
      now,
      dateRange: 'wtd',
      instruments: [europe]
    });

    // Wednesday and Thursday are known, Friday is projected
    expect(sessions.map(({ start }) => new Date(start).toISOString())).toEqual([
      '2026-10-21T07:00:00.000Z',
      '2026-10-22T07:00:00.000Z',
      '2026-10-23T07:00:00.000Z'
    ]);
  });

  it('builds a grid of the intervals of the sessions', () => {
    const grid = getIntradayGrid({
      intervalInMs: 30 * MINUTE,
      sessions: [
        {
          end: time('2026-10-22T08:00:00Z'),
          start: time('2026-10-22T07:00:00Z')
        }
      ]
    });

    expect(grid).toEqual([
      time('2026-10-22T07:00:00Z'),
      time('2026-10-22T07:30:00Z')
    ]);
  });

  it('takes the last price at or before a time', () => {
    expect(
      getPriceAt({ prices: europe.prices, time: time('2026-10-22T07:59:00Z') })
    ).toBe(101);
    expect(
      getPriceAt({ prices: europe.prices, time: time('2026-10-20T00:00:00Z') })
    ).toBeUndefined();
  });

  it('takes the close of the regular session as baseline, not the post-market', () => {
    expect(
      getBaselinePrice({
        instrument: unitedStates,
        start: time('2026-10-22T07:00:00Z')
      })
    ).toBe(50);
  });

  it('computes the change of an instrument while it is traded', () => {
    const grid = [
      time('2026-10-22T06:00:00Z'),
      time('2026-10-22T07:00:00Z'),
      time('2026-10-22T08:00:00Z'),
      time('2026-10-22T08:30:00Z'),
      time('2026-10-22T10:00:00Z')
    ];

    const items = getInstrumentIntradayItems({
      grid,
      now,
      instrument: europe,
      intervalInMs: MINUTE,
      start: time('2026-10-22T07:00:00Z')
    });

    // Not drawn before the first and after the last price
    expect(items.map(({ value }) => value)).toEqual([
      null,
      expect.closeTo(0.01, 10),
      expect.closeTo(0.02, 10),
      null,
      null
    ]);
  });

  it('computes the change of the portfolio adjusted for a buy', () => {
    const start = time('2026-10-22T07:00:00Z');

    const items = getPortfolioIntradayItems({
      now,
      start,
      cashFlows: [{ amount: 102, time: time('2026-10-22T08:00:00Z') }],
      grid: [start, time('2026-10-22T08:00:00Z')],
      holdings: [
        {
          ...europe,
          exchangeRate: { now: 1, start: 1 },
          // One share bought at 08:00 for 102
          quantity: 2,
          quantityChanges: [{ quantity: 1, time: time('2026-10-22T08:00:00Z') }]
        }
      ],
      intervalInMs: MINUTE
    });

    // 07:00: 1 share from 100 to 101
    expect(items[0].value).toBeCloseTo(0.01);

    // 08:00: 2 shares at 102 (204) - 100 - 102 = 2 on an investment of 202
    expect(items[1].value).toBeCloseTo(2 / 202);
  });

  it('moves the value with the exchange rate of the holding', () => {
    const start = time('2026-10-22T07:00:00Z');
    const now = time('2026-10-22T08:00:00Z');

    const items = getPortfolioIntradayItems({
      now,
      start,
      cashFlows: [],
      grid: [start, time('2026-10-22T07:30:00Z'), now],
      holdings: [
        {
          ...europe,
          // The price stays at 100, only the exchange rate moves from 1 to 1.1
          prices: [{ price: 100, time: time('2026-10-21T15:29:00Z') }],
          exchangeRate: { now: 1.1, start: 1 },
          quantity: 1,
          quantityChanges: []
        }
      ],
      intervalInMs: MINUTE
    });

    // The change of the rate is the change of the value: half way at 07:30, all of it at 08:00
    expect(items[1].value).toBeCloseTo(0.05);
    expect(items[2].value).toBeCloseTo(0.1);
  });

  it('starts from the stored close instead of the last intraday price', () => {
    expect(
      getBaselinePrice({
        instrument: { ...europe, baselinePrice: 99 },
        start: time('2026-10-22T07:00:00Z')
      })
    ).toBe(99);
  });

  it('takes the live price after the last intraday price (closing auction)', () => {
    const start = time('2026-10-22T07:00:00Z');

    const items = getPortfolioIntradayItems({
      start,
      cashFlows: [],
      grid: [start, time('2026-10-22T08:00:00Z'), time('2026-10-22T16:00:00Z')],
      holdings: [
        {
          ...europe,
          baselinePrice: 100,
          exchangeRate: { now: 1, start: 1 },
          livePrice: 103,
          quantity: 1,
          quantityChanges: []
        }
      ],
      intervalInMs: MINUTE,
      now: time('2026-10-22T17:00:00Z')
    });

    // 07:00: intraday price 101. From the last intraday price on: the live
    // price, which is the official close after the closing auction
    expect(items[0].value).toBeCloseTo(0.01);
    expect(items[1].value).toBeCloseTo(0.03);
    expect(items[2].value).toBeCloseTo(0.03);
  });

  it('ends at the change of the value from the stored closes to the live prices', () => {
    const start = time('2026-10-22T07:00:00Z');
    const now = time('2026-10-22T19:00:00Z');

    const items = getPortfolioIntradayItems({
      now,
      start,
      cashFlows: [],
      grid: [start, now],
      holdings: [
        {
          ...europe,
          baselinePrice: 100,
          exchangeRate: { now: 1, start: 1 },
          livePrice: 103,
          quantity: 2,
          quantityChanges: []
        },
        {
          ...unitedStates,
          baselinePrice: 50,
          exchangeRate: { now: 0.92, start: 0.9 },
          livePrice: 52,
          quantity: 1,
          quantityChanges: []
        }
      ],
      intervalInMs: MINUTE
    });

    const startValue = 2 * 100 + 50 * 0.9;
    const currentValue = 2 * 103 + 52 * 0.92;

    // The same change as the performance of the date range
    expect(items.at(-1).value).toBeCloseTo(
      (currentValue - startValue) / startValue,
      10
    );
  });

  it('detects an open market including the pre-market', () => {
    expect(
      isAnyMarketOpen({
        instruments: [unitedStates],
        now: time('2026-10-22T09:00:00Z')
      })
    ).toBe(true);

    expect(
      isAnyMarketOpen({
        instruments: [unitedStates],
        now: time('2026-10-22T05:00:00Z')
      })
    ).toBe(false);
  });
});

describe('intraday helper with several trading days', () => {
  it('leaves a gap while the market of an instrument is closed', () => {
    const items = getInstrumentIntradayItems({
      grid: [
        time('2026-10-21T15:00:00Z'),
        time('2026-10-21T20:00:00Z'),
        time('2026-10-22T07:00:00Z')
      ],
      instrument: europe,
      intervalInMs: MINUTE,
      now: time('2026-10-22T09:00:00Z'),
      start: time('2026-10-21T07:00:00Z')
    });

    expect(items[1].value).toBeNull();
    expect(items[2].value).not.toBeNull();
  });
});
