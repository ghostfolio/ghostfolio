import { Injectable } from '@nestjs/common';
import { bool, cleanEnv, num, port, str } from 'envalid';

import { Environment } from './interfaces/environment.interface';

@Injectable()
export class ConfigurationService {
  private readonly environmentConfiguration: Environment;

  public constructor() {
    this.environmentConfiguration = cleanEnv(process.env, {
      ACCESS_TOKEN_SALT: str(),
      ALPHA_VANTAGE_API_KEY: str({ default: '' }),
      CACHE_TTL: num({ default: 1 }),
      ENABLE_FEATURE_CUSTOM_SYMBOLS: bool({ default: false }),
      ENABLE_FEATURE_FEAR_AND_GREED_INDEX: bool({ default: false }),
      ENABLE_FEATURE_SOCIAL_LOGIN: bool({ default: false }),
      GOOGLE_CLIENT_ID: str({ default: 'dummyClientId' }),
      GOOGLE_SECRET: str({ default: 'dummySecret' }),
      JWT_SECRET_KEY: str({}),
      MAX_ITEM_IN_CACHE: num({ default: 9999 }),
      PORT: port({ default: 3333 }),
      RAKUTEN_RAPID_API_KEY: str({ default: '' }),
      REDIS_HOST: str({ default: 'localhost' }),
      REDIS_PORT: port({ default: 6379 }),
      ROOT_URL: str({ default: 'http://localhost:4200' })
    });
  }

  public get<K extends keyof Environment>(key: K): Environment[K] {
    return this.environmentConfiguration[key];
  }
}
