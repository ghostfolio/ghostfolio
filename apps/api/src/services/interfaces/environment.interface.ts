import { CleanedEnvAccessors } from 'envalid';

export interface Environment extends CleanedEnvAccessors {
  ACCESS_TOKEN_SALT: string;
  ALPHA_VANTAGE_API_KEY: string;
  CACHE_TTL: number;
  ENABLE_FEATURE_CUSTOM_SYMBOLS: boolean;
  ENABLE_FEATURE_FEAR_AND_GREED_INDEX: boolean;
  ENABLE_FEATURE_SOCIAL_LOGIN: boolean;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_SECRET: string;
  JWT_SECRET_KEY: string;
  MAX_ITEM_IN_CACHE: number;
  PORT: number;
  RAKUTEN_RAPID_API_KEY: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
  ROOT_URL: string;
}
