import { IDataGatheringItem } from '@ghostfolio/api/services/interfaces/interfaces';
import { Currency } from '@prisma/client';
import { DataSource } from '@prisma/client';

export const baseCurrency = Currency.USD;

export const benchmarks: Partial<IDataGatheringItem>[] = [
  { dataSource: DataSource.YAHOO, symbol: 'VOO' }
];

export const currencyPairs: Partial<IDataGatheringItem>[] = [
  { dataSource: DataSource.YAHOO, symbol: `${Currency.USD}${Currency.EUR}` },
  { dataSource: DataSource.YAHOO, symbol: `${Currency.USD}${Currency.GBP}` },
  { dataSource: DataSource.YAHOO, symbol: `${Currency.USD}${Currency.CHF}` }
];

export const ghostfolioScraperApiSymbolPrefix = '_GF_';
export const ghostfolioCashSymbol = `${ghostfolioScraperApiSymbolPrefix}CASH`;

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

export const UNKNOWN_KEY = 'UNKNOWN';
