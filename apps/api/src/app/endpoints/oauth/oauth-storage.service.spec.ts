import { RedisCacheService } from '@ghostfolio/api/services/redis-cache/redis-cache.service';

import ms from 'ms';

import { OAuthAuthorizationCode } from './interfaces/oauth-authorization-code.interface';
import { OAuthStorageService } from './oauth-storage.service';

describe('OAuthStorageService', () => {
  let store: Map<string, { expiresAt: number; value: string }>;
  let redisCacheService: jest.Mocked<
    Pick<RedisCacheService, 'get' | 'remove' | 'set'>
  >;
  let service: OAuthStorageService;

  const sampleAuthCode: OAuthAuthorizationCode = {
    clientId: 'https://client.example.com/client.json',
    codeChallenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    codeChallengeMethod: 'S256',
    redirectUri: 'https://client.example.com/callback',
    resource: 'https://ghostfol.io/mcp',
    scope: 'mcp:read',
    userId: 'user-123'
  };

  beforeEach(() => {
    store = new Map();

    redisCacheService = {
      get: jest.fn((key: string) => {
        const entry = store.get(key);

        if (!entry) {
          return Promise.resolve(undefined);
        }

        if (Date.now() >= entry.expiresAt) {
          store.delete(key);
          return Promise.resolve(undefined);
        }

        return Promise.resolve(entry.value);
      }),
      remove: jest.fn((key: string) => {
        return Promise.resolve(store.delete(key));
      }),
      set: jest.fn((key: string, value: string, ttl?: number) => {
        store.set(key, {
          expiresAt: Date.now() + (ttl ?? ms('5 minutes')),
          value
        });
        return Promise.resolve(value);
      })
    };

    service = new OAuthStorageService(
      redisCacheService as unknown as RedisCacheService
    );
  });

  it('stores authorization code with oauth:code: prefix and default 5-minute TTL', async () => {
    await service.storeAuthorizationCode('abc123', sampleAuthCode);

    expect(redisCacheService.set).toHaveBeenCalledWith(
      'oauth:code:abc123',
      JSON.stringify(sampleAuthCode),
      ms('5 minutes')
    );
  });

  it('consumes authorization code once and returns null on second consumption', async () => {
    await service.storeAuthorizationCode('single-use-code', sampleAuthCode);

    const first = await service.consumeAuthorizationCode('single-use-code');
    const second = await service.consumeAuthorizationCode('single-use-code');

    expect(first).toEqual(sampleAuthCode);
    expect(second).toBeNull();
    expect(redisCacheService.remove).toHaveBeenCalledWith(
      'oauth:code:single-use-code'
    );
  });

  it('returns null when consuming a non-existent code', async () => {
    const result = await service.consumeAuthorizationCode('missing-code');

    expect(result).toBeNull();
    expect(redisCacheService.remove).not.toHaveBeenCalled();
  });

  it('returns null after the authorization code TTL expires', async () => {
    jest.useFakeTimers();

    try {
      await service.storeAuthorizationCode(
        'expiring-code',
        sampleAuthCode,
        1000
      );

      jest.advanceTimersByTime(1001);

      const result = await service.consumeAuthorizationCode('expiring-code');
      expect(result).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });
});
