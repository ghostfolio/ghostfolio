import { utc } from '@date-fns/utc';
import { MarketData } from '@prisma/client';
import { Big } from 'big.js';
import { format } from 'date-fns';

import { BenchmarkPrice } from './activity-matched-benchmark';

export interface BenchmarkMarketDataResult {
  prices: BenchmarkPrice[];
  excludedCarriedForward: number;
  excludedIntraday: number;
}

export function adaptBenchmarkMarketData({
  marketData
}: {
  marketData: MarketData[];
}): BenchmarkMarketDataResult {
  const prices: BenchmarkPrice[] = [];
  let excludedCarriedForward = 0;
  let excludedIntraday = 0;

  for (const item of marketData) {
    if (item.isCarriedForward) {
      excludedCarriedForward += 1;
      continue;
    }

    if (item.state !== 'CLOSE') {
      excludedIntraday += 1;
      continue;
    }

    if (!(item.date instanceof Date) || !Number.isFinite(item.date.getTime())) {
      throw new Error('Invalid benchmark market date');
    }

    if (!Number.isFinite(item.marketPrice) || item.marketPrice <= 0) {
      throw new Error(
        `Invalid benchmark market price: ${format(item.date, 'yyyy-MM-dd', { in: utc })}`
      );
    }

    const price = new Big(item.marketPrice);

    prices.push({
      date: format(item.date, 'yyyy-MM-dd', { in: utc }),
      price: price.toString()
    });
  }

  prices.sort((a, b) => a.date.localeCompare(b.date));

  for (let i = 1; i < prices.length; i++) {
    if (prices[i].date === prices[i - 1].date) {
      throw new Error(`Duplicate benchmark price: ${prices[i].date}`);
    }
  }

  return {
    prices,
    excludedCarriedForward,
    excludedIntraday
  };
}
