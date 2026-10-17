import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import type { Environment } from '@ghostfolio/api/services/interfaces/environment.interface';

import {
  getRedisConnectionOptions,
  getRedisConnectionUrl
} from './redis.helper';

function createConfigurationService(overrides: Partial<Environment> = {}) {
  const configuration: Record<string, unknown> = {
    REDIS_DB: 0,
    REDIS_HOST: 'localhost',
    REDIS_PASSWORD: '***',
    REDIS_PORT: 6379,
    REDIS_TLS: false,
    ...overrides
  };

  return {
    get: jest.fn((key: string) => configuration[key])
  } as unknown as ConfigurationService;
}

describe('redis.helper', () => {
  describe('getRedisConnectionOptions', () => {
    it('should return connection options without TLS when REDIS_TLS is false', () => {
      const configurationService = createConfigurationService();

      const options = getRedisConnectionOptions(configurationService);

      expect(options).toEqual({
        db: 0,
        host: 'localhost',
        password: '***',
        port: 6379
      });
      expect(options.tls).toBeUndefined();
    });

    it('should return connection options with tls object when REDIS_TLS is true', () => {
      const configurationService = createConfigurationService({
        REDIS_TLS: true
      });

      const options = getRedisConnectionOptions(configurationService);

      expect(options).toEqual({
        db: 0,
        host: 'localhost',
        password: '***',
        port: 6379,
        tls: {}
      });
    });
  });

  describe('getRedisConnectionUrl', () => {
    it('should return standard redis:// URL when REDIS_TLS is false', () => {
      const configurationService = createConfigurationService();

      const url = getRedisConnectionUrl(configurationService);

      expect(url).toBe('redis://:***@localhost:6379/0');
    });

    it('should return rediss:// URL when REDIS_TLS is true', () => {
      const configurationService = createConfigurationService({
        REDIS_TLS: true
      });

      const url = getRedisConnectionUrl(configurationService);

      expect(url).toBe('rediss://:***@localhost:6379/0');
    });

    it('should format URL correctly without password', () => {
      const configurationService = createConfigurationService({
        REDIS_PASSWORD: ''
      });

      const url = getRedisConnectionUrl(configurationService);

      expect(url).toBe('redis://@localhost:6379/0');
    });
  });
});
