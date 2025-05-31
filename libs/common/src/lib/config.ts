import { DataSource } from '@prisma/client';
import { JobOptions, JobStatus } from 'bull';
import ms from 'ms';

export const ghostfolioPrefix = 'GF';
export const ghostfolioScraperApiSymbolPrefix = `_${ghostfolioPrefix}_`;
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

export const CACHE_TTL_NO_CACHE = 1;
export const CACHE_TTL_INFINITE = 0;

export const DATA_GATHERING_QUEUE = 'DATA_GATHERING_QUEUE';
export const DATA_GATHERING_QUEUE_PRIORITY_HIGH = 1;
export const DATA_GATHERING_QUEUE_PRIORITY_LOW = Number.MAX_SAFE_INTEGER;
export const DATA_GATHERING_QUEUE_PRIORITY_MEDIUM = Math.round(
  DATA_GATHERING_QUEUE_PRIORITY_LOW / 2
);

export const PORTFOLIO_SNAPSHOT_COMPUTATION_QUEUE =
  'PORTFOLIO_SNAPSHOT_COMPUTATION_QUEUE';
export const PORTFOLIO_SNAPSHOT_COMPUTATION_QUEUE_PRIORITY_HIGH = 1;
export const PORTFOLIO_SNAPSHOT_COMPUTATION_QUEUE_PRIORITY_LOW =
  Number.MAX_SAFE_INTEGER;

export const DEFAULT_CURRENCY = 'USD';
export const DEFAULT_DATE_FORMAT_MONTH_YEAR = 'MMM yyyy';
export const DEFAULT_HOST = '0.0.0.0';
export const DEFAULT_LANGUAGE_CODE = 'en';
export const DEFAULT_PAGE_SIZE = 50;
export const DEFAULT_PORT = 3333;
export const DEFAULT_PROCESSOR_GATHER_ASSET_PROFILE_CONCURRENCY = 1;
export const DEFAULT_PROCESSOR_GATHER_HISTORICAL_MARKET_DATA_CONCURRENCY = 1;
export const DEFAULT_PROCESSOR_PORTFOLIO_SNAPSHOT_COMPUTATION_CONCURRENCY = 1;
export const DEFAULT_PROCESSOR_PORTFOLIO_SNAPSHOT_COMPUTATION_TIMEOUT = 30000;

// USX is handled separately
export const DERIVED_CURRENCIES = [
  {
    currency: 'GBp',
    factor: 100,
    rootCurrency: 'GBP'
  },
  {
    currency: 'ILA',
    factor: 100,
    rootCurrency: 'ILS'
  },
  {
    currency: 'ZAc',
    factor: 100,
    rootCurrency: 'ZAR'
  }
];

export const GATHER_ASSET_PROFILE_PROCESS_JOB_NAME = 'GATHER_ASSET_PROFILE';
export const GATHER_ASSET_PROFILE_PROCESS_JOB_OPTIONS: JobOptions = {
  attempts: 12,
  backoff: {
    delay: ms('1 minute'),
    type: 'exponential'
  },
  removeOnComplete: true
};

export const GATHER_HISTORICAL_MARKET_DATA_PROCESS_JOB_NAME =
  'GATHER_HISTORICAL_MARKET_DATA';
export const GATHER_HISTORICAL_MARKET_DATA_PROCESS_JOB_OPTIONS: JobOptions = {
  attempts: 12,
  backoff: {
    delay: ms('1 minute'),
    type: 'exponential'
  },
  removeOnComplete: true
};

export const PORTFOLIO_SNAPSHOT_PROCESS_JOB_NAME = 'PORTFOLIO';
export const PORTFOLIO_SNAPSHOT_PROCESS_JOB_OPTIONS: JobOptions = {
  removeOnComplete: true
};

export const HEADER_KEY_IMPERSONATION = 'Impersonation-Id';
export const HEADER_KEY_TIMEZONE = 'Timezone';
export const HEADER_KEY_TOKEN = 'Authorization';
export const HEADER_KEY_SKIP_INTERCEPTOR = 'X-Skip-Interceptor';

export const MAX_TOP_HOLDINGS = 50;

export const NUMERICAL_PRECISION_THRESHOLD = 100000;

export const PROPERTY_API_KEY_GHOSTFOLIO = 'API_KEY_GHOSTFOLIO';
export const PROPERTY_BENCHMARKS = 'BENCHMARKS';
export const PROPERTY_BETTER_UPTIME_MONITOR_ID = 'BETTER_UPTIME_MONITOR_ID';
export const PROPERTY_COUNTRIES_OF_SUBSCRIBERS = 'COUNTRIES_OF_SUBSCRIBERS';
export const PROPERTY_COUPONS = 'COUPONS';
export const PROPERTY_CURRENCIES = 'CURRENCIES';
export const PROPERTY_DATA_SOURCE_MAPPING = 'DATA_SOURCE_MAPPING';
export const PROPERTY_DATA_SOURCES_GHOSTFOLIO_DATA_PROVIDER_MAX_REQUESTS =
  'DATA_SOURCES_GHOSTFOLIO_DATA_PROVIDER_MAX_REQUESTS';
export const PROPERTY_DEMO_ACCOUNT_ID = 'DEMO_ACCOUNT_ID';
export const PROPERTY_DEMO_USER_ID = 'DEMO_USER_ID';
export const PROPERTY_DEMO_USER_ID_LEGACY = 'DEMO_USER_ID_LEGACY';
export const PROPERTY_IS_DATA_GATHERING_ENABLED = 'IS_DATA_GATHERING_ENABLED';
export const PROPERTY_IS_READ_ONLY_MODE = 'IS_READ_ONLY_MODE';
export const PROPERTY_IS_USER_SIGNUP_ENABLED = 'IS_USER_SIGNUP_ENABLED';
export const PROPERTY_SLACK_COMMUNITY_USERS = 'SLACK_COMMUNITY_USERS';
export const PROPERTY_STRIPE_CONFIG = 'STRIPE_CONFIG';
export const PROPERTY_SYSTEM_MESSAGE = 'SYSTEM_MESSAGE';

export const QUEUE_JOB_STATUS_LIST = [
  'active',
  'completed',
  'delayed',
  'failed',
  'paused',
  'waiting'
] as JobStatus[];

export const REPLACE_NAME_PARTS = [
  'Amundi Index Solutions -',
  'iShares ETF (CH) -',
  'iShares III Public Limited Company -',
  'iShares V PLC -',
  'iShares VI Public Limited Company -',
  'iShares VII PLC -',
  'Multi Units Luxembourg -',
  'VanEck ETFs N.V. -',
  'Vaneck Vectors Ucits Etfs Plc -',
  'Vanguard Funds Public Limited Company -',
  'Vanguard Index Funds -',
  'Xtrackers (IE) Plc -'
];

export const STORYBOOK_PATH = '/development/storybook';

export const SUPPORTED_LANGUAGE_CODES = [
  'ca',
  'de',
  'en',
  'es',
  'fr',
  'it',
  'nl',
  'pl',
  'pt',
  'tr',
  'uk',
  'zh'
];

export const TAG_ID_EMERGENCY_FUND = '4452656d-9fa4-4bd0-ba38-70492e31d180';
export const TAG_ID_DEMO = 'efa08cb3-9b9d-4974-ac68-db13a19c4874';

export const UNKNOWN_KEY = 'UNKNOWN';
