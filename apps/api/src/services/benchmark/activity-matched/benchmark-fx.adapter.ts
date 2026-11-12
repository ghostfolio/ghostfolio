import {
  DERIVED_CURRENCIES,
  DEFAULT_CURRENCY
} from '@ghostfolio/common/config';

import { Big } from 'big.js';

import { BenchmarkPrice } from './activity-matched-benchmark';
import {
  DEFAULT_MAX_PRICE_AGE_DAYS,
  validateMaxPriceAgeDays
} from './benchmark-price-policy';

export interface BenchmarkFxQuote {
  currencyFrom: string;
  currencyTo: string;
  date: string;
  rate: string;
}

export type BenchmarkFxConversionMethod =
  'IDENTITY' | 'DIRECT' | 'INDIRECT' | 'DERIVED';

export interface BenchmarkFxComponent {
  pair: string;
  sourceDate?: string;
  ageInDays?: number;
  rate: string;
  kind: 'MARKET' | 'FIXED';
}

export interface BenchmarkFxConversion {
  date: string;
  method: BenchmarkFxConversionMethod;
  rate: string;
  components: BenchmarkFxComponent[];
}

export interface BenchmarkFxResult {
  prices: BenchmarkPrice[];
  conversions: BenchmarkFxConversion[];
}

export interface BenchmarkFxInput {
  prices: BenchmarkPrice[];
  currencyFrom: string;
  currencyTo: string;
  fxQuotes: BenchmarkFxQuote[];
  maxFxAgeDays?: number;
}

function calendarDay(date: string): number {
  const time = Date.parse(`${date}T00:00:00Z`);

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(time) ||
    new Date(time).toISOString().slice(0, 10) !== date
  ) {
    throw new Error(`Invalid FX date: ${date}`);
  }

  return time / 86400000;
}

type ResolvedQuote = BenchmarkFxQuote & {
  day: number;
  rateValue: Big;
};

interface FxLeg {
  pair: string;
  inverse: boolean;
  quotes: ResolvedQuote[];
}

function resolveLeg(
  currencyFrom: string,
  currencyTo: string,
  quotes: ResolvedQuote[]
): FxLeg | undefined {
  const direct = quotes.filter(
    (quote) =>
      quote.currencyFrom === currencyFrom && quote.currencyTo === currencyTo
  );

  if (direct.length > 0) {
    return {
      pair: `${currencyFrom}${currencyTo}`,
      inverse: false,
      quotes: direct
    };
  }

  const inverse = quotes.filter(
    (quote) =>
      quote.currencyFrom === currencyTo && quote.currencyTo === currencyFrom
  );

  if (inverse.length > 0) {
    return {
      pair: `${currencyTo}${currencyFrom}`,
      inverse: true,
      quotes: inverse
    };
  }

  return undefined;
}

export function findLatestFxQuote<T extends { day: number }>(
  quotes: T[],
  targetDay: number
): T | undefined {
  let low = 0;
  let high = quotes.length - 1;
  let result: T | undefined;

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
}

function selectRate({
  leg,
  date,
  day,
  maxAge
}: {
  leg: FxLeg;
  date: string;
  day: number;
  maxAge: number;
}): {
  quote: ResolvedQuote;
  component: BenchmarkFxComponent;
} {
  const quote = findLatestFxQuote(leg.quotes, day);

  if (!quote) {
    throw new Error(`Missing FX rate: ${leg.pair} ${date}`);
  }

  const ageInDays = day - quote.day;

  if (ageInDays > maxAge) {
    throw new Error(`Stale FX rate: ${leg.pair} ${date}`);
  }

  return {
    quote,
    component: {
      pair: leg.pair,
      sourceDate: quote.date,
      ageInDays,
      rate: quote.rateValue.toString(),
      kind: 'MARKET'
    }
  };
}

export function convertBenchmarkPrices({
  prices,
  currencyFrom,
  currencyTo,
  fxQuotes,
  maxFxAgeDays = DEFAULT_MAX_PRICE_AGE_DAYS
}: BenchmarkFxInput): BenchmarkFxResult {
  validateMaxPriceAgeDays(maxFxAgeDays);

  const quotes = fxQuotes
    .map((quote): ResolvedQuote => {
      const day = calendarDay(quote.date);
      let rateValue: Big;

      try {
        rateValue = new Big(quote.rate);
      } catch {
        throw new Error(`Invalid FX rate: ${quote.date}`);
      }

      if (!rateValue.gt(0)) {
        throw new Error(`Invalid FX rate: ${quote.date}`);
      }

      return { ...quote, day, rateValue };
    })
    .sort((a, b) => a.day - b.day);

  const seen = new Set<string>();

  for (const quote of quotes) {
    const key = `${quote.currencyFrom}|${quote.currencyTo}|${quote.date}`;

    if (seen.has(key)) {
      throw new Error(
        `Duplicate FX rate: ${quote.currencyFrom}${quote.currencyTo} ${quote.date}`
      );
    }

    seen.add(key);
  }

  const derivedFrom = DERIVED_CURRENCIES.find(
    ({ currency }) => currency === currencyFrom
  );
  const derivedTo = DERIVED_CURRENCIES.find(
    ({ currency }) => currency === currencyTo
  );

  const rootFrom = derivedFrom?.rootCurrency ?? currencyFrom;
  const rootTo = derivedTo?.rootCurrency ?? currencyTo;

  const fixedFactor = derivedFrom
    ? new Big(1).div(derivedFrom.factor)
    : new Big(1);

  const fixedComponent: BenchmarkFxComponent | undefined = derivedFrom
    ? {
        pair: `${currencyFrom}${rootFrom}`,
        rate: fixedFactor.toString(),
        kind: 'FIXED'
      }
    : undefined;

  const targetFixedComponent: BenchmarkFxComponent | undefined = derivedTo
    ? {
        pair: `${rootTo}${currencyTo}`,
        rate: new Big(derivedTo.factor).toString(),
        kind: 'FIXED'
      }
    : undefined;

  const directLeg =
    rootFrom === rootTo ? undefined : resolveLeg(rootFrom, rootTo, quotes);

  const indirectFrom =
    rootFrom === DEFAULT_CURRENCY
      ? undefined
      : resolveLeg(DEFAULT_CURRENCY, rootFrom, quotes);

  const indirectTo =
    rootTo === DEFAULT_CURRENCY
      ? undefined
      : resolveLeg(DEFAULT_CURRENCY, rootTo, quotes);

  const useIndirect =
    rootFrom !== rootTo &&
    !directLeg &&
    (rootFrom === DEFAULT_CURRENCY || !!indirectFrom) &&
    (rootTo === DEFAULT_CURRENCY || !!indirectTo);

  const conversions: BenchmarkFxConversion[] = [];
  const convertedPrices: BenchmarkPrice[] = [];

  for (const price of prices) {
    const priceDay = calendarDay(price.date);
    let amount: Big;

    try {
      amount = new Big(price.price);
    } catch {
      throw new Error(`Invalid benchmark price: ${price.date}`);
    }

    if (!amount.gt(0)) {
      throw new Error(`Invalid benchmark price: ${price.date}`);
    }

    const components: BenchmarkFxComponent[] = [];
    let converted = amount.mul(fixedFactor);
    let method: BenchmarkFxConversionMethod =
      derivedFrom || derivedTo ? 'DERIVED' : 'IDENTITY';

    if (fixedComponent) {
      components.push(fixedComponent);
    }

    if (rootFrom !== rootTo) {
      if (directLeg) {
        const { quote, component } = selectRate({
          leg: directLeg,
          date: price.date,
          day: priceDay,
          maxAge: maxFxAgeDays
        });

        converted = directLeg.inverse
          ? converted.div(quote.rateValue)
          : converted.mul(quote.rateValue);

        components.push(component);

        if (!derivedFrom && !derivedTo) {
          method = 'DIRECT';
        }
      } else if (useIndirect) {
        if (indirectFrom) {
          const { quote, component } = selectRate({
            leg: indirectFrom,
            date: price.date,
            day: priceDay,
            maxAge: maxFxAgeDays
          });

          converted = indirectFrom.inverse
            ? converted.mul(quote.rateValue)
            : converted.div(quote.rateValue);

          components.push(component);
        }

        if (indirectTo) {
          const { quote, component } = selectRate({
            leg: indirectTo,
            date: price.date,
            day: priceDay,
            maxAge: maxFxAgeDays
          });

          converted = indirectTo.inverse
            ? converted.div(quote.rateValue)
            : converted.mul(quote.rateValue);

          components.push(component);
        }

        if (!derivedFrom && !derivedTo) {
          method = 'INDIRECT';
        }
      } else {
        throw new Error(`Missing FX rate: ${rootFrom}${rootTo} ${price.date}`);
      }
    }

    if (targetFixedComponent) {
      converted = converted.mul(derivedTo.factor);
      components.push(targetFixedComponent);
    }

    convertedPrices.push({
      ...price,
      price: converted.toString()
    });

    conversions.push({
      date: price.date,
      method,
      rate: converted.div(amount).toString(),
      components
    });
  }

  return {
    prices: convertedPrices,
    conversions
  };
}
