import { CleanedEnvAccessors } from 'envalid';

export interface Environment extends CleanedEnvAccessors {
  ACCESS_TOKEN_SALT: string;
  ALPHA_VANTAGE_API_KEY: string;
  CACHE_TTL: number;
  DATA_SOURCES: string | string[]; // string is not correct, error in envalid?
  ENABLE_FEATURE_BLOG: boolean;
  ENABLE_FEATURE_CUSTOM_SYMBOLS: boolean;
  ENABLE_FEATURE_FEAR_AND_GREED_INDEX: boolean;
  ENABLE_FEATURE_IMPORT: boolean;
  ENABLE_FEATURE_READ_ONLY_MODE: boolean;
  ENABLE_FEATURE_SOCIAL_LOGIN: boolean;
  ENABLE_FEATURE_STATISTICS: boolean;
  ENABLE_FEATURE_SUBSCRIPTION: boolean;
  ENABLE_FEATURE_SYSTEM_MESSAGE: boolean;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_SECRET: string;
  JWT_SECRET_KEY: string;
  MAX_ITEM_IN_CACHE: number;
  MAX_ORDERS_TO_IMPORT: number;
  PORT: number;
  RAKUTEN_RAPID_API_KEY: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
  ROOT_URL: string;
  STRIPE_PUBLIC_KEY: string;
  STRIPE_SECRET_KEY: string;
  WEB_AUTH_RP_ID: string;
}
