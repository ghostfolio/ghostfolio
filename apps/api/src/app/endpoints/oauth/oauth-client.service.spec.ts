import * as ssrfGuardHelper from '@ghostfolio/api/helper/ssrf-guard.helper';
import { RedisCacheService } from '@ghostfolio/api/services/redis-cache/redis-cache.service';

import { OAuthError, OAuthErrorCode } from '@modelcontextprotocol/server';
import ms from 'ms';

import { OAuthClientMetadata } from './interfaces/oauth-client-metadata.interface';
import { OAuthClientService } from './oauth-client.service';

describe('OAuthClientService', () => {
  let redisCacheService: jest.Mocked<
    Pick<RedisCacheService, 'get' | 'remove' | 'set'>
  >;
  let service: OAuthClientService;

  const clientId = 'https://client.example.com/oauth/client.json';

  const validMetadataResponse = {
    client_id: clientId,
    client_name: 'Example MCP Client',
    redirect_uris: [
      'https://client.example.com/callback',
      'http://127.0.0.1/callback',
      'http://localhost/callback'
    ]
  };

  beforeEach(() => {
    jest.restoreAllMocks();

    redisCacheService = {
      get: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(true),
      set: jest.fn().mockResolvedValue(undefined)
    };

    service = new OAuthClientService(
      redisCacheService as unknown as RedisCacheService
    );
  });

  describe('getClient', () => {
    it('fetches, validates, applies defaults, and caches client metadata', async () => {
      const fetchSpy = jest
        .spyOn(ssrfGuardHelper, 'fetchJsonWithSsrfGuard')
        .mockResolvedValueOnce(validMetadataResponse);

      const client = await service.getClient(clientId);

      expect(client).toEqual({
        client_id: clientId,
        client_name: 'Example MCP Client',
        grant_types: ['authorization_code'],
        redirect_uris: validMetadataResponse.redirect_uris,
        response_types: ['code']
      });
      expect(fetchSpy).toHaveBeenCalledWith(clientId);
      expect(redisCacheService.set).toHaveBeenCalledWith(
        `oauth:client:${clientId}`,
        JSON.stringify(client),
        ms('1 hour')
      );
    });

    it('returns cached client metadata without fetching externally', async () => {
      const cachedClient: OAuthClientMetadata = {
        client_id: clientId,
        client_name: 'Cached Client',
        grant_types: ['authorization_code'],
        redirect_uris: ['https://client.example.com/callback'],
        response_types: ['code']
      };
      redisCacheService.get.mockResolvedValueOnce(JSON.stringify(cachedClient));
      const fetchSpy = jest.spyOn(ssrfGuardHelper, 'fetchJsonWithSsrfGuard');

      const client = await service.getClient(clientId);

      expect(client).toEqual(cachedClient);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('rejects client_id with non-HTTPS scheme or blocked IP before cache lookup', async () => {
      await expect(
        service.getClient('http://client.example.com/client.json')
      ).rejects.toMatchObject({
        code: OAuthErrorCode.InvalidClientMetadata
      });
      expect(redisCacheService.get).not.toHaveBeenCalled();
    });

    it('rejects client_id containing a URL fragment', async () => {
      await expect(
        service.getClient(`${clientId}#section`)
      ).rejects.toMatchObject({
        code: OAuthErrorCode.InvalidClientMetadata
      });
      expect(redisCacheService.get).not.toHaveBeenCalled();
    });

    it('throws invalid_client_metadata when document client_id does not match URL', async () => {
      jest
        .spyOn(ssrfGuardHelper, 'fetchJsonWithSsrfGuard')
        .mockResolvedValueOnce({
          ...validMetadataResponse,
          client_id: 'https://other.example.com/client.json'
        });

      await expect(service.getClient(clientId)).rejects.toMatchObject({
        code: OAuthErrorCode.InvalidClientMetadata
      });
      expect(redisCacheService.set).not.toHaveBeenCalled();
    });

    it('throws invalid_client_metadata when client_name is missing or empty', async () => {
      jest
        .spyOn(ssrfGuardHelper, 'fetchJsonWithSsrfGuard')
        .mockResolvedValueOnce({
          ...validMetadataResponse,
          client_name: '   '
        });

      await expect(service.getClient(clientId)).rejects.toMatchObject({
        code: OAuthErrorCode.InvalidClientMetadata
      });
    });

    it('throws invalid_client_metadata when redirect_uris is empty or invalid', async () => {
      jest
        .spyOn(ssrfGuardHelper, 'fetchJsonWithSsrfGuard')
        .mockResolvedValueOnce({
          ...validMetadataResponse,
          redirect_uris: ['not-a-valid-uri']
        });

      await expect(service.getClient(clientId)).rejects.toMatchObject({
        code: OAuthErrorCode.InvalidClientMetadata
      });
    });

    it('propagates timeout errors from fetchJsonWithSsrfGuard as OAuthError', async () => {
      jest
        .spyOn(ssrfGuardHelper, 'fetchJsonWithSsrfGuard')
        .mockRejectedValueOnce(
          new OAuthError(
            OAuthErrorCode.InvalidClientMetadata,
            `Failed to fetch JSON from ${clientId}`
          )
        );

      await expect(service.getClient(clientId)).rejects.toMatchObject({
        code: OAuthErrorCode.InvalidClientMetadata
      });
    });
  });

  describe('validateRedirectUri', () => {
    const client: OAuthClientMetadata = {
      client_id: clientId,
      client_name: 'Example MCP Client',
      grant_types: ['authorization_code'],
      redirect_uris: [
        'https://client.example.com/callback',
        'http://127.0.0.1/callback',
        'http://[::1]/callback',
        'http://localhost/callback'
      ],
      response_types: ['code']
    };

    it('accepts exact redirect_uri matches', () => {
      expect(
        service.validateRedirectUri(
          client,
          'https://client.example.com/callback'
        )
      ).toBe(true);
    });

    it('rejects unregistered redirect_uris', () => {
      expect(
        service.validateRedirectUri(client, 'https://evil.example.com/callback')
      ).toBe(false);
      expect(
        service.validateRedirectUri(
          client,
          'https://client.example.com/other-path'
        )
      ).toBe(false);
    });

    it('allows arbitrary ports on registered loopback redirect_uris (RFC 8252 §7.3)', () => {
      expect(
        service.validateRedirectUri(client, 'http://127.0.0.1:54321/callback')
      ).toBe(true);
      expect(
        service.validateRedirectUri(client, 'http://[::1]:54321/callback')
      ).toBe(true);
      expect(
        service.validateRedirectUri(client, 'http://localhost:8080/callback')
      ).toBe(true);
    });

    it('rejects loopback redirect_uris with mismatched path, query, or scheme', () => {
      expect(
        service.validateRedirectUri(client, 'http://127.0.0.1:54321/other')
      ).toBe(false);
      expect(
        service.validateRedirectUri(
          client,
          'http://127.0.0.1:54321/callback?extra=1'
        )
      ).toBe(false);
      expect(
        service.validateRedirectUri(client, 'https://127.0.0.1:54321/callback')
      ).toBe(false);
    });

    it('rejects malformed redirect_uris and URIs containing fragments', () => {
      expect(service.validateRedirectUri(client, 'not-a-uri')).toBe(false);
      expect(
        service.validateRedirectUri(
          client,
          'https://client.example.com/callback#frag'
        )
      ).toBe(false);
    });
  });
});
