import { Big } from 'big.js';

import {
  BenchmarkPrice,
  BenchmarkValuationStatus,
  FinancialPoint
} from './activity-matched-benchmark';
import {
  BenchmarkFxComponent,
  BenchmarkFxQuote,
  convertBenchmarkPrices
} from './benchmark-fx.adapter';
import {
  DEFAULT_MAX_PRICE_AGE_DAYS,
  validateMaxPriceAgeDays
} from './benchmark-price-policy';

export interface BenchmarkDisplayValuation {
  date: string;
  value: string;
  benchmarkPriceSourceDate: string;
  fxSourceDate?: string;
  fxComponents: BenchmarkFxComponent[];
  valuationStatus: BenchmarkValuationStatus;
}

export interface BenchmarkDisplayValuationInput {
  points: FinancialPoint[];
  prices: BenchmarkPrice[];
  fxQuotes: BenchmarkFxQuote[];
  currencyFrom: string;
  currencyTo: string;
  maxPriceAgeDays?: number;
  maxFxAgeDays?: number;
}

function calendarDay(date: string): number {
  const time = Date.parse(`${date}T00:00:00Z`);

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(time) ||
    new Date(time).toISOString().slice(0, 10) !== date
  ) {
    throw new Error(`Invalid benchmark date: ${date}`);
  }

  return time / 86400000;
}

export function createBenchmarkDisplayValuations({
  points,
  prices,
  fxQuotes,
  currencyFrom,
  currencyTo,
  maxPriceAgeDays = DEFAULT_MAX_PRICE_AGE_DAYS,
  maxFxAgeDays
}: BenchmarkDisplayValuationInput): BenchmarkDisplayValuation[] {
  validateMaxPriceAgeDays(maxPriceAgeDays);

  const displayPoints = points.filter(({ displayOnly }) => displayOnly);

  if (displayPoints.length === 0) {
    return [];
  }

  const quotes = prices
    .map((price) => {
      const day = calendarDay(price.date);
      const sourceDate = price.sourceDate ?? price.date;
      const sourceDay =
        sourceDate === price.date ? day : calendarDay(sourceDate);

      if (sourceDay > day) {
        throw new Error(`Invalid benchmark source date: ${sourceDate}`);
      }

      return { ...price, day, sourceDate, sourceDay };
    })
    .sort((a, b) => a.day - b.day);

  for (let i = 1; i < quotes.length; i++) {
    if (quotes[i].day === quotes[i - 1].day) {
      throw new Error(`Duplicate benchmark price: ${quotes[i].date}`);
    }
  }

  const findLatestPrice = (targetDay: number) => {
    let low = 0;
    let high = quotes.length - 1;
    let result: (typeof quotes)[number] | undefined;

    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      const quote = quotes[middle];

      if (quote.day <= targetDay) {
        result = quote;
        low = middle + 1;
      } else {
        high = middle - 1;
      }
    }

    return result;
  };

  // Validate benchmark history and display points before converting FX once.
  // If several inputs are invalid, preparation errors precede batch FX errors;
  // display points retain caller order in preparation and conversion.
  const prepared = displayPoints.map((point) => {
    const targetDay = calendarDay(point.date);

    if (!point.units.gt(0)) {
      return {
        point,
        price: undefined,
        sourceDate: undefined,
        ageInDays: 0
      };
    }

    const quote = findLatestPrice(targetDay);

    if (!quote) {
      throw new Error(`Missing display price: ${point.date}`);
    }

    const ageInDays = targetDay - quote.sourceDay;

    if (ageInDays > maxPriceAgeDays) {
      throw new Error(`Stale display price: ${point.date}`);
    }

    return {
      point,
      price: {
        date: point.date,
        price: quote.price,
        sourceDate: quote.sourceDate
      },
      sourceDate: quote.sourceDate,
      ageInDays
    };
  });

  const active = prepared.filter(
    (
      item
    ): item is typeof item & {
      price: BenchmarkPrice;
    } => item.price !== undefined
  );

  const converted =
    active.length > 0
      ? convertBenchmarkPrices({
          prices: active.map(({ price }) => price),
          currencyFrom,
          currencyTo,
          fxQuotes,
          maxFxAgeDays
        })
      : { prices: [], conversions: [] };

  let conversionIndex = 0;

  return prepared.map(({ point, price, sourceDate, ageInDays }) => {
    if (!price) {
      return {
        date: point.date,
        value: '0',
        benchmarkPriceSourceDate: '',
        fxComponents: [],
        valuationStatus: 'NOT_APPLICABLE'
      };
    }

    const convertedPrice = converted.prices[conversionIndex];
    const conversion = converted.conversions[conversionIndex];

    conversionIndex += 1;

    const fxComponents = conversion.components;
    const marketComponents = fxComponents.filter(
      ({ kind }) => kind === 'MARKET'
    );

    const fxSourceDate =
      marketComponents.length === 1
        ? marketComponents[0].sourceDate
        : undefined;

    return {
      date: point.date,
      value: point.units.mul(new Big(convertedPrice.price)).toString(),
      benchmarkPriceSourceDate: sourceDate,
      ...(fxSourceDate ? { fxSourceDate } : {}),
      fxComponents,
      valuationStatus: ageInDays === 0 ? 'CURRENT' : 'CARRIED_FORWARD'
    };
  });
}
