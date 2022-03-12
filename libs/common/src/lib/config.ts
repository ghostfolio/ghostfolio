import { DataSource } from '@prisma/client';

import { ToggleOption } from './types';

export const baseCurrency = 'USD';

export const defaultDateRangeOptions: ToggleOption[] = [
  { label: 'Today', value: '1d' },
  { label: 'YTD', value: 'ytd' },
  { label: '1Y', value: '1y' },
  { label: '5Y', value: '5y' },
  { label: 'Max', value: 'max' }
];

export const DEMO_USER_ID = '9b112b4d-3b7d-4bad-9bdd-3b0f7b4dac2f';

export const ghostfolioScraperApiSymbolPrefix = '_GF_';
export const ghostfolioCashSymbol = `${ghostfolioScraperApiSymbolPrefix}CASH`;
export const ghostfolioFearAndGreedIndexDataSource = DataSource.RAKUTEN;
export const ghostfolioFearAndGreedIndexSymbol = `${ghostfolioScraperApiSymbolPrefix}FEAR_AND_GREED_INDEX`;

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

export const warnColorHex = '#dc3545';
export const warnColorRgb = {
  r: 220,
  g: 53,
  b: 69
};

export const ASSET_SUB_CLASS_EMERGENCY_FUND = 'EMERGENCY_FUND';

export const DEFAULT_DATE_FORMAT = 'dd.MM.yyyy';
export const DEFAULT_DATE_FORMAT_MONTH_YEAR = 'MMM yyyy';

export const PROPERTY_COUPONS = 'COUPONS';
export const PROPERTY_CURRENCIES = 'CURRENCIES';
export const PROPERTY_IS_READ_ONLY_MODE = 'IS_READ_ONLY_MODE';
export const PROPERTY_LAST_DATA_GATHERING = 'LAST_DATA_GATHERING';
export const PROPERTY_LOCKED_DATA_GATHERING = 'LOCKED_DATA_GATHERING';
export const PROPERTY_SLACK_COMMUNITY_USERS = 'SLACK_COMMUNITY_USERS';
export const PROPERTY_STRIPE_CONFIG = 'STRIPE_CONFIG';
export const PROPERTY_SYSTEM_MESSAGE = 'SYSTEM_MESSAGE';

export const UNKNOWN_KEY = 'UNKNOWN';
