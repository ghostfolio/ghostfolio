import type { PortfolioIntradayItem } from '@ghostfolio/common/interfaces';

export type IntradayDateRange = '1d' | 'mtd' | 'wtd';

export interface IntradayPeriod {
  end: number;
  start: number;
  type: 'post' | 'pre' | 'regular';
}

export interface IntradayInstrument {
  /** Realtime price, used for the interval which contains the current time */
  livePrice?: number;

  /** Sorted by time */
  prices: { price: number; time: number }[];

  tradingPeriods: IntradayPeriod[];
}

export interface IntradayHolding extends IntradayInstrument {
  /** Exchange rate from the currency of the holding to the base currency */
  exchangeRate: number;

  /** Current quantity */
  quantity: number;

  /** Quantity bought (positive) or sold (negative) per time */
  quantityChanges: { quantity: number; time: number }[];
}

export interface IntradayCashFlow {
  /** Positive for a buy, negative for a sell (in the base currency) */
  amount: number;
  time: number;
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const INTRADAY_INTERVALS: Record<
  IntradayDateRange,
  { interval: '5m' | '15m' | '60m'; intervalInMs: number }
> = {
  // About 200 to 400 points per chart, as on the charts of the brokers
  '1d': { interval: '5m', intervalInMs: 5 * 60 * 1000 },
  mtd: { interval: '60m', intervalInMs: 60 * 60 * 1000 },
  wtd: { interval: '15m', intervalInMs: 15 * 60 * 1000 }
};

function getDayKey(aTime: number) {
  return new Date(aTime).toISOString().slice(0, 10);
}

function getTimeOfDayKey(aDayKey: string) {
  return Date.parse(`${aDayKey}T00:00:00.000Z`);
}

/**
 * Returns the merged trading sessions (including the pre-market and the
 * post-market) of the date range. The sessions of the remaining days of the
 * week or month are projected from the latest known trading day.
 */
export function getIntradaySessions({
  dateRange,
  instruments,
  now
}: {
  dateRange: IntradayDateRange;
  instruments: IntradayInstrument[];
  now: number;
}): { end: number; start: number }[] {
  const periodsByDay = new Map<string, IntradayPeriod[]>();

  for (const { tradingPeriods } of instruments) {
    for (const period of tradingPeriods) {
      const key = getDayKey(period.start);

      if (!periodsByDay.has(key)) {
        periodsByDay.set(key, []);
      }

      periodsByDay.get(key).push(period);
    }
  }

  const startedDays = [...periodsByDay.keys()]
    .filter((key) => {
      return (
        Math.min(...periodsByDay.get(key).map(({ start }) => start)) <= now
      );
    })
    .sort();

  if (startedDays.length === 0) {
    return [];
  }

  const latestStartedDay = startedDays.at(-1);
  let days: string[];

  if (dateRange === '1d') {
    days = [latestStartedDay];
  } else {
    const today = new Date(now);
    let firstDay: Date;
    let lastDay: Date;

    if (dateRange === 'wtd') {
      // Monday to Friday of the current week
      const weekday = (today.getUTCDay() + 6) % 7;
      firstDay = new Date(
        getTimeOfDayKey(getDayKey(now)) - weekday * DAY_IN_MS
      );
      lastDay = new Date(firstDay.getTime() + 4 * DAY_IN_MS);
    } else {
      firstDay = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)
      );
      lastDay = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0)
      );
    }

    const firstKey = getDayKey(firstDay.getTime());
    const lastKey = getDayKey(lastDay.getTime());

    days = startedDays.filter((key) => {
      return key >= firstKey && key <= lastKey;
    });

    // Project the trading sessions of the remaining weekdays
    const pattern = periodsByDay.get([...periodsByDay.keys()].sort().at(-1));
    const patternDay = getTimeOfDayKey(getDayKey(pattern[0].start));

    for (
      let time = getTimeOfDayKey(latestStartedDay) + DAY_IN_MS;
      getDayKey(time) <= lastKey;
      time += DAY_IN_MS
    ) {
      const weekday = new Date(time).getUTCDay();

      if (weekday === 0 || weekday === 6) {
        continue;
      }

      const key = getDayKey(time);

      if (!periodsByDay.has(key)) {
        periodsByDay.set(
          key,
          pattern.map((period) => {
            return {
              ...period,
              end: period.end + (time - patternDay),
              start: period.start + (time - patternDay)
            };
          })
        );
      }

      days.push(key);
    }

    if (days.length === 0) {
      days = [latestStartedDay];
    }
  }

  const periods = days
    .flatMap((key) => {
      return periodsByDay.get(key);
    })
    .filter(({ end, start }) => {
      return end > start;
    })
    .sort((a, b) => {
      return a.start - b.start;
    });

  const sessions: { end: number; start: number }[] = [];

  for (const { end, start } of periods) {
    const last = sessions.at(-1);

    if (last && start <= last.end) {
      last.end = Math.max(last.end, end);
    } else {
      sessions.push({ end, start });
    }
  }

  return sessions;
}

/**
 * Returns the start times of the intervals of the trading sessions
 */
export function getIntradayGrid({
  intervalInMs,
  sessions
}: {
  intervalInMs: number;
  sessions: { end: number; start: number }[];
}) {
  const grid = new Set<number>();

  for (const { end, start } of sessions) {
    for (
      let time = Math.floor(start / intervalInMs) * intervalInMs;
      time < end;
      time += intervalInMs
    ) {
      grid.add(time);
    }
  }

  return [...grid].sort((a, b) => {
    return a - b;
  });
}

/**
 * Returns the closing price before the start of the date range, preferring
 * the close of the regular session over the post-market
 */
export function getBaselinePrice({
  instrument: { livePrice, prices, tradingPeriods },
  start
}: {
  instrument: IntradayInstrument;
  start: number;
}) {
  const lastRegularEnd = Math.max(
    ...tradingPeriods
      .filter(({ end, type }) => {
        return type === 'regular' && end <= start;
      })
      .map(({ end }) => {
        return end;
      })
  );

  const limit = Number.isFinite(lastRegularEnd) ? lastRegularEnd : start;

  return (
    getPriceAt({ prices, time: limit - 1 }) ??
    getPriceAt({ prices, time: start - 1 }) ??
    prices[0]?.price ??
    livePrice
  );
}

/**
 * Returns the last price at or before the given time
 */
export function getPriceAt({
  prices,
  time
}: {
  prices: IntradayInstrument['prices'];
  time: number;
}) {
  let low = 0;
  let high = prices.length - 1;
  let result: number | undefined;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);

    if (prices[middle].time <= time) {
      result = prices[middle].price;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return result;
}

function getPriceOfInterval({
  baseline,
  instrument,
  intervalInMs,
  now,
  time
}: {
  baseline: number;
  instrument: IntradayInstrument;
  intervalInMs: number;
  now: number;
  time: number;
}) {
  if (
    instrument.livePrice !== undefined &&
    now >= time &&
    now < time + intervalInMs
  ) {
    return instrument.livePrice;
  }

  return (
    getPriceAt({ prices: instrument.prices, time: time + intervalInMs - 1 }) ??
    baseline
  );
}

/**
 * Returns the change of the value of the holdings since the start of the date
 * range per interval, adjusted for the buys and sells in the date range
 */
export function getPortfolioIntradayItems({
  cashFlows,
  grid,
  holdings,
  intervalInMs,
  now,
  start
}: {
  cashFlows: IntradayCashFlow[];
  grid: number[];
  holdings: IntradayHolding[];
  intervalInMs: number;
  now: number;
  start: number;
}): PortfolioIntradayItem[] {
  const getQuantityAt = (aHolding: IntradayHolding, aTime: number) => {
    // Revert the changes after the given time
    return aHolding.quantityChanges.reduce((quantity, change) => {
      return change.time > aTime ? quantity - change.quantity : quantity;
    }, aHolding.quantity);
  };

  const baselines = holdings.map((holding) => {
    return getBaselinePrice({ start, instrument: holding }) ?? 0;
  });

  const startValue = holdings.reduce((sum, holding, index) => {
    return (
      sum +
      getQuantityAt(holding, start) * baselines[index] * holding.exchangeRate
    );
  }, 0);

  return grid.map((time) => {
    if (time > now) {
      return { date: new Date(time).toISOString(), value: null };
    }

    const value = holdings.reduce((sum, holding, index) => {
      return (
        sum +
        getQuantityAt(holding, time + intervalInMs - 1) *
          getPriceOfInterval({
            intervalInMs,
            now,
            time,
            baseline: baselines[index],
            instrument: holding
          }) *
          holding.exchangeRate
      );
    }, 0);

    const cashFlow = cashFlows.reduce((sum, { amount, time: flowTime }) => {
      return flowTime >= start && flowTime < time + intervalInMs
        ? sum + amount
        : sum;
    }, 0);

    const investment = startValue + Math.max(cashFlow, 0);

    return {
      date: new Date(time).toISOString(),
      value: investment > 0 ? (value - startValue - cashFlow) / investment : 0
    };
  });
}

/**
 * Returns the change of the price of an instrument since the start of the
 * date range per interval
 */
export function getInstrumentIntradayItems({
  grid,
  instrument,
  intervalInMs,
  now,
  start
}: {
  grid: number[];
  instrument: IntradayInstrument;
  intervalInMs: number;
  now: number;
  start: number;
}): PortfolioIntradayItem[] {
  const baseline = getBaselinePrice({ instrument, start });

  // The line of an instrument is only drawn while it is traded
  const pricesInRange = instrument.prices.filter(({ time }) => {
    return time >= start;
  });
  const firstTime = pricesInRange[0]?.time ?? Number.POSITIVE_INFINITY;
  const lastTime = Math.max(
    pricesInRange.at(-1)?.time ?? Number.NEGATIVE_INFINITY,
    instrument.livePrice !== undefined ? now : Number.NEGATIVE_INFINITY
  );

  const isTraded = (aTime: number) => {
    return (
      instrument.tradingPeriods.length === 0 ||
      instrument.tradingPeriods.some(({ end, start }) => {
        return aTime + intervalInMs > start && aTime < end;
      })
    );
  };

  return grid.map((time) => {
    if (
      time > now ||
      !baseline ||
      time + intervalInMs <= firstTime ||
      time > lastTime ||
      !isTraded(time)
    ) {
      return { date: new Date(time).toISOString(), value: null };
    }

    const price = getPriceOfInterval({
      baseline,
      instrument,
      intervalInMs,
      now,
      time
    });

    return { date: new Date(time).toISOString(), value: price / baseline - 1 };
  });
}

/**
 * Whether the current time is in a trading period (including the pre-market
 * and the post-market) of one of the instruments
 */
export function isAnyMarketOpen({
  instruments,
  now
}: {
  instruments: IntradayInstrument[];
  now: number;
}) {
  return instruments.some(({ tradingPeriods }) => {
    return tradingPeriods.some(({ end, start }) => {
      return now >= start && now < end;
    });
  });
}
