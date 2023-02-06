import * as currencies from '@dinero.js/currencies';
import { DataSource } from '@prisma/client';
import Big from 'big.js';
import { getDate, getMonth, getYear, parse, subDays } from 'date-fns';
import { de, es, fr, it, nl, pt } from 'date-fns/locale';

import { ghostfolioScraperApiSymbolPrefix, locale } from './config';
import { Benchmark } from './interfaces';
import { ColorScheme } from './types';

const NUMERIC_REGEXP = /[-]{0,1}[\d]*[.,]{0,1}[\d]+/g;

export function capitalize(aString: string) {
  return aString.charAt(0).toUpperCase() + aString.slice(1).toLowerCase();
}

export function decodeDataSource(encodedDataSource: string) {
  return Buffer.from(encodedDataSource, 'hex').toString();
}

export function downloadAsFile({
  content,
  contentType = 'text/plain',
  fileName,
  format
}: {
  content: unknown;
  contentType?: string;
  fileName: string;
  format: 'json' | 'string';
}) {
  const a = document.createElement('a');

  if (format === 'json') {
    content = JSON.stringify(content, undefined, '  ');
  }

  const file = new Blob([<string>content], {
    type: contentType
  });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
}

export function encodeDataSource(aDataSource: DataSource) {
  if (aDataSource) {
    return Buffer.from(aDataSource, 'utf-8').toString('hex');
  }

  return undefined;
}

export function extractNumberFromString(aString: string): number {
  try {
    const [numberString] = aString.match(NUMERIC_REGEXP);
    return parseFloat(numberString.trim());
  } catch {
    return undefined;
  }
}

export function getBackgroundColor(aColorScheme: ColorScheme) {
  return getCssVariable(
    aColorScheme === 'DARK' ||
      window.matchMedia('(prefers-color-scheme: dark)').matches
      ? '--dark-background'
      : '--light-background'
  );
}

export function getCssVariable(aCssVariable: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(
    aCssVariable
  );
}

export function getDateFnsLocale(aLanguageCode: string) {
  if (aLanguageCode === 'de') {
    return de;
  } else if (aLanguageCode === 'es') {
    return es;
  } else if (aLanguageCode === 'fr') {
    return fr;
  } else if (aLanguageCode === 'it') {
    return it;
  } else if (aLanguageCode === 'nl') {
    return nl;
  } else if (aLanguageCode === 'pt') {
    return pt;
  }

  return undefined;
}

export function getDateFormatString(aLocale?: string) {
  const formatObject = new Intl.DateTimeFormat(aLocale).formatToParts(
    new Date()
  );

  return formatObject
    .map((object) => {
      switch (object.type) {
        case 'day':
          return 'dd';
        case 'month':
          return 'MM';
        case 'year':
          return 'yyyy';
        default:
          return object.value;
      }
    })
    .join('');
}

export function getDateWithTimeFormatString(aLocale?: string) {
  return `${getDateFormatString(aLocale)}, HH:mm:ss`;
}

export function getEmojiFlag(aCountryCode: string) {
  if (!aCountryCode) {
    return aCountryCode;
  }

  return aCountryCode
    .toUpperCase()
    .replace(/./g, (character) =>
      String.fromCodePoint(127397 + character.charCodeAt(0))
    );
}

export function getLocale() {
  return navigator.languages?.length
    ? navigator.languages[0]
    : navigator.language ?? locale;
}

export function getNumberFormatDecimal(aLocale?: string) {
  const formatObject = new Intl.NumberFormat(aLocale).formatToParts(9999.99);

  return formatObject.find((object) => {
    return object.type === 'decimal';
  }).value;
}

export function getNumberFormatGroup(aLocale?: string) {
  const formatObject = new Intl.NumberFormat(aLocale).formatToParts(9999.99);

  return formatObject.find((object) => {
    return object.type === 'group';
  }).value;
}

export function getSum(aArray: Big[]) {
  if (aArray?.length > 0) {
    return aArray.reduce((a, b) => a.plus(b), new Big(0));
  }

  return new Big(0);
}

export function getTextColor(aColorScheme: ColorScheme) {
  const cssVariable = getCssVariable(
    aColorScheme === 'DARK' ||
      window.matchMedia('(prefers-color-scheme: dark)').matches
      ? '--light-primary-text'
      : '--dark-primary-text'
  );

  const [r, g, b] = cssVariable.split(',');

  return `${r}, ${g}, ${b}`;
}

export function getToday() {
  const year = getYear(new Date());
  const month = getMonth(new Date());
  const day = getDate(new Date());

  return new Date(Date.UTC(year, month, day));
}

export function getUtc(aDateString: string) {
  const [yearString, monthString, dayString] = aDateString.split('-');

  return new Date(
    Date.UTC(
      parseInt(yearString, 10),
      parseInt(monthString, 10) - 1,
      parseInt(dayString, 10)
    )
  );
}

export function getYesterday() {
  const year = getYear(new Date());
  const month = getMonth(new Date());
  const day = getDate(new Date());

  return subDays(new Date(Date.UTC(year, month, day)), 1);
}

export function groupBy<T, K extends keyof T>(
  key: K,
  arr: T[]
): Map<T[K], T[]> {
  const map = new Map<T[K], T[]>();
  arr.forEach((t) => {
    if (!map.has(t[key])) {
      map.set(t[key], []);
    }
    map.get(t[key])!.push(t);
  });
  return map;
}

export function isCurrency(aSymbol = '') {
  return currencies[aSymbol];
}

export function resetHours(aDate: Date) {
  const year = getYear(aDate);
  const month = getMonth(aDate);
  const day = getDate(aDate);

  return new Date(Date.UTC(year, month, day));
}

export function resolveFearAndGreedIndex(aValue: number) {
  if (aValue <= 25) {
    return { emoji: '🥵', text: 'Extreme Fear' };
  } else if (aValue <= 45) {
    return { emoji: '😨', text: 'Fear' };
  } else if (aValue <= 55) {
    return { emoji: '😐', text: 'Neutral' };
  } else if (aValue < 75) {
    return { emoji: '😜', text: 'Greed' };
  } else {
    return { emoji: '🤪', text: 'Extreme Greed' };
  }
}

export function resolveMarketCondition(
  aMarketCondition: Benchmark['marketCondition']
) {
  if (aMarketCondition === 'BEAR_MARKET') {
    return { emoji: '🐻' };
  } else if (aMarketCondition === 'BULL_MARKET') {
    return { emoji: '🐮' };
  } else {
    return { emoji: '⚪' };
  }
}

export const DATE_FORMAT = 'yyyy-MM-dd';
export const DATE_FORMAT_MONTHLY = 'MMMM yyyy';
export const DATE_FORMAT_YEARLY = 'yyyy';

export function parseDate(date: string) {
  return parse(date, DATE_FORMAT, new Date());
}

export function prettifySymbol(aSymbol: string): string {
  return aSymbol?.replace(ghostfolioScraperApiSymbolPrefix, '');
}
