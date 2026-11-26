import { Big } from 'big.js';

import { BenchmarkPrice } from './activity-matched-benchmark';
import {
  DEFAULT_MAX_PRICE_AGE_DAYS,
  validateMaxPriceAgeDays
} from './benchmark-price-policy';

export interface PreparedBenchmarkPrice extends BenchmarkPrice {
  sourceDate?: string;
}

export interface BenchmarkPriceAdapterResult {
  prices: PreparedBenchmarkPrice[];
  carriedForward: {
    date: string;
    sourceDate: string;
    ageInDays: number;
  }[];
}

function calendarDay(date: string): number {
  const time = Date.parse(`${date}T00:00:00Z`);

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(time) ||
    new Date(time).toISOString().slice(0, 10) !== date
  ) {
    throw new Error(`Invalid date: ${date}`);
  }

  return time / 86400000;
}

export function prepareBenchmarkPrices({
  executionDates,
  maxExecutionAgeDays = DEFAULT_MAX_PRICE_AGE_DAYS,
  prices
}: {
  executionDates: string[];
  maxExecutionAgeDays?: number;
  prices: BenchmarkPrice[];
}): BenchmarkPriceAdapterResult {
  validateMaxPriceAgeDays(maxExecutionAgeDays);

  const quotes = prices
    .map(({ date, price }) => {
      const day = calendarDay(date);
      const amount = new Big(price);

      if (!amount.gt(0)) {
        throw new Error(`Invalid benchmark price: ${date}`);
      }

      return { date, day, price: amount.toString() };
    })
    .sort((a, b) => a.day - b.day);

  for (let i = 1; i < quotes.length; i++) {
    if (quotes[i].day === quotes[i - 1].day) {
      throw new Error(`Duplicate benchmark price: ${quotes[i].date}`);
    }
  }

  const executions = [...new Set(executionDates)]
    .map((date) => ({ date, day: calendarDay(date) }))
    .sort((a, b) => a.day - b.day);

  const synthetic: PreparedBenchmarkPrice[] = [];
  const carriedForward: BenchmarkPriceAdapterResult['carriedForward'] = [];

  let quoteIndex = 0;
  let previous: (typeof quotes)[number] | undefined;

  for (const execution of executions) {
    while (
      quoteIndex < quotes.length &&
      quotes[quoteIndex].day <= execution.day
    ) {
      previous = quotes[quoteIndex++];
    }

    if (!previous) {
      throw new Error(`Missing historical price: ${execution.date}`);
    }

    const ageInDays = execution.day - previous.day;

    if (ageInDays > maxExecutionAgeDays) {
      throw new Error(`Stale execution price: ${execution.date}`);
    }

    if (previous.day !== execution.day) {
      synthetic.push({
        date: execution.date,
        price: previous.price,
        sourceDate: previous.date
      });

      carriedForward.push({
        date: execution.date,
        sourceDate: previous.date,
        ageInDays
      });
    }
  }

  return {
    prices: [
      ...quotes.map(({ date, price }) => ({ date, price })),
      ...synthetic
    ].sort((a, b) => a.date.localeCompare(b.date)),
    carriedForward
  };
}
