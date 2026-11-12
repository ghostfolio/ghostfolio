import {
  DEFAULT_CURRENCY,
  DERIVED_CURRENCIES
} from '@ghostfolio/common/config';

export interface BenchmarkFxPair {
  currencyFrom: string;
  currencyTo: string;
  symbol: string;
}

export function getBenchmarkFxPairs({
  currencyFrom,
  currencyTo
}: {
  currencyFrom: string;
  currencyTo: string;
}): BenchmarkFxPair[] {
  if (currencyFrom === currencyTo) {
    return [];
  }

  const rootFrom =
    DERIVED_CURRENCIES.find(({ currency }) => currency === currencyFrom)
      ?.rootCurrency ?? currencyFrom;

  const rootTo =
    DERIVED_CURRENCIES.find(({ currency }) => currency === currencyTo)
      ?.rootCurrency ?? currencyTo;

  if (rootFrom === rootTo) {
    return [];
  }

  const pairs = new Map<string, BenchmarkFxPair>();

  const addPair = (from: string, to: string) => {
    if (from === to) {
      return;
    }

    const symbol = `${from}${to}`;

    pairs.set(symbol, {
      currencyFrom: from,
      currencyTo: to,
      symbol
    });
  };

  const addBothDirections = (from: string, to: string) => {
    addPair(from, to);
    addPair(to, from);
  };

  addBothDirections(rootFrom, rootTo);

  if (rootFrom !== DEFAULT_CURRENCY && rootTo !== DEFAULT_CURRENCY) {
    addBothDirections(DEFAULT_CURRENCY, rootFrom);
    addBothDirections(DEFAULT_CURRENCY, rootTo);
  }

  return [...pairs.values()];
}
