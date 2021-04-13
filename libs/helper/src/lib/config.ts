import { Currency } from '.prisma/client';

export const baseCurrency = Currency.CHF;

export const benchmarks = [
  'CSSMIM.SW',
  'GC=F',
  'GF.FEAR_AND_GREED_INDEX',
  'VOO',
  'VTI',
  'VWRD.L',
  'VXUS'
];

export const currencyPairs = [
  `${Currency.EUR}${Currency.CHF}`,
  `${Currency.GBP}${Currency.CHF}`,
  `${Currency.GBP}${Currency.EUR}`,
  `${Currency.USD}${Currency.EUR}`,
  `${Currency.USD}${Currency.GBP}`,
  `${Currency.USD}${Currency.CHF}`
];

export const locale = 'de-CH';

export const primaryColorHex = '#36cfcc';
export const primaryColorRgb = {
  r: 54,
  g: 207,
  b: 204
};

export const secondaryColorHex = '#3686cf';
export const secondaryColorRgb = {
  r: 54,
  g: 134,
  b: 207
};

export const DEFAULT_DATE_FORMAT = 'dd.MM.yyyy';
export const DEFAULT_DATE_FORMAT_MONTH_YEAR = 'MMM yyyy';
