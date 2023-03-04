import { DataSource } from '@prisma/client';
import { JobOptions, JobStatus } from 'bull';
import ms from 'ms';

export const ghostfolioPrefix = 'GF';
export const ghostfolioScraperApiSymbolPrefix = `_${ghostfolioPrefix}_`;
export const ghostfolioCashSymbol = `${ghostfolioScraperApiSymbolPrefix}CASH`;
export const ghostfolioFearAndGreedIndexDataSource = DataSource.RAPID_API;
export const ghostfolioFearAndGreedIndexSymbol = `${ghostfolioScraperApiSymbolPrefix}FEAR_AND_GREED_INDEX`;

export const locale = 'en-US';

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

export const DATA_GATHERING_QUEUE = 'DATA_GATHERING_QUEUE';
export const DATA_GATHERING_QUEUE_PRIORITY_LOW = Number.MAX_SAFE_INTEGER;
export const DATA_GATHERING_QUEUE_PRIORITY_HIGH = 1;

export const DEFAULT_DATE_FORMAT_MONTH_YEAR = 'MMM yyyy';
export const DEFAULT_LANGUAGE_CODE = 'en';
export const DEFAULT_PAGE_SIZE = 50;

export const EMERGENCY_FUND_TAG_ID = '4452656d-9fa4-4bd0-ba38-70492e31d180';

export const GATHER_ASSET_PROFILE_PROCESS = 'GATHER_ASSET_PROFILE';
export const GATHER_ASSET_PROFILE_PROCESS_OPTIONS: JobOptions = {
  attempts: 10,
  backoff: {
    delay: ms('1 minute'),
    type: 'exponential'
  },
  priority: DATA_GATHERING_QUEUE_PRIORITY_HIGH,
  removeOnComplete: {
    age: ms('2 weeks') / 1000
  }
};
export const GATHER_HISTORICAL_MARKET_DATA_PROCESS =
  'GATHER_HISTORICAL_MARKET_DATA';
export const GATHER_HISTORICAL_MARKET_DATA_PROCESS_OPTIONS: JobOptions = {
  attempts: 10,
  backoff: {
    delay: ms('1 minute'),
    type: 'exponential'
  },
  priority: DATA_GATHERING_QUEUE_PRIORITY_LOW,
  removeOnComplete: {
    age: ms('2 weeks') / 1000
  }
};

export const HEADER_KEY_IMPERSONATION = 'Impersonation-Id';
export const HEADER_KEY_TIMEZONE = 'Timezone';
export const HEADER_KEY_TOKEN = 'Authorization';

export const MAX_CHART_ITEMS = 365;

export const PROPERTY_BENCHMARKS = 'BENCHMARKS';
export const PROPERTY_COUNTRIES_OF_SUBSCRIBERS = 'COUNTRIES_OF_SUBSCRIBERS';
export const PROPERTY_COUPONS = 'COUPONS';
export const PROPERTY_CURRENCIES = 'CURRENCIES';
export const PROPERTY_DEMO_USER_ID = 'DEMO_USER_ID';
export const PROPERTY_IS_READ_ONLY_MODE = 'IS_READ_ONLY_MODE';
export const PROPERTY_IS_USER_SIGNUP_ENABLED = 'IS_USER_SIGNUP_ENABLED';
export const PROPERTY_SLACK_COMMUNITY_USERS = 'SLACK_COMMUNITY_USERS';
export const PROPERTY_STRIPE_CONFIG = 'STRIPE_CONFIG';
export const PROPERTY_SYSTEM_MESSAGE = 'SYSTEM_MESSAGE';

export const QUEUE_JOB_STATUS_LIST = <JobStatus[]>[
  'active',
  'completed',
  'delayed',
  'failed',
  'paused',
  'waiting'
];

export const UNKNOWN_KEY = 'UNKNOWN';
