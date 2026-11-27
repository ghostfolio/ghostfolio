import {
  assertSafeExternalUrl,
  fetchJsonWithSsrfGuard
} from '@ghostfolio/api/helper/ssrf-guard.helper';
import { RedisCacheService } from '@ghostfolio/api/services/redis-cache/redis-cache.service';

import { OAuthError, OAuthErrorCode } from '@modelcontextprotocol/server';
import { Injectable } from '@nestjs/common';
import ms from 'ms';

import { OAuthClientMetadata } from './interfaces/oauth-client-metadata.interface';

const LOOPBACK_HOSTNAMES = new Set(['127.0.0.1', '[::1]', 'localhost']);

@Injectable()
export class OAuthClientService {
  private static readonly CACHE_KEY_PREFIX = 'oauth:client:';
  private static readonly CACHE_TTL_MS = ms('1 hour');

  public constructor(private readonly redisCacheService: RedisCacheService) {}

  public async getClient(clientId: string): Promise<OAuthClientMetadata> {
    const parsedClientUrl = assertSafeExternalUrl(clientId);

    if (parsedClientUrl.hash) {
      throw new OAuthError(
        OAuthErrorCode.InvalidClientMetadata,
        'Client ID URL must not contain a fragment'
      );
    }

    const cacheKey = `${OAuthClientService.CACHE_KEY_PREFIX}${clientId}`;
    const cached = await this.redisCacheService.get(cacheKey);

    if (cached) {
      try {
        return JSON.parse(cached) as OAuthClientMetadata;
      } catch {
        // Ignore corrupted cache entry and refetch
      }
    }

    const rawMetadata = await fetchJsonWithSsrfGuard<unknown>(clientId);
    const metadata = this.parseClientMetadata(rawMetadata, clientId);

    await this.redisCacheService.set(
      cacheKey,
      JSON.stringify(metadata),
      OAuthClientService.CACHE_TTL_MS
    );

    return metadata;
  }

  public validateRedirectUri(
    client: OAuthClientMetadata,
    redirectUri: string
  ): boolean {
    let requestedUrl: URL;

    try {
      requestedUrl = new URL(redirectUri);
    } catch {
      return false;
    }

    if (requestedUrl.hash) {
      return false;
    }

    return client.redirect_uris.some((registeredUri) => {
      if (registeredUri === redirectUri) {
        return true;
      }

      return this.matchesLoopbackRedirectUri(registeredUri, requestedUrl);
    });
  }

  private isValidRedirectUri(uri: unknown): uri is string {
    if (typeof uri !== 'string') {
      return false;
    }

    try {
      const parsed = new URL(uri);
      return !parsed.hash;
    } catch {
      return false;
    }
  }

  private matchesLoopbackRedirectUri(
    registeredUri: string,
    requestedUrl: URL
  ): boolean {
    if (
      requestedUrl.protocol !== 'http:' ||
      !LOOPBACK_HOSTNAMES.has(requestedUrl.hostname)
    ) {
      return false;
    }

    let registeredUrl: URL;

    try {
      registeredUrl = new URL(registeredUri);
    } catch {
      return false;
    }

    return (
      registeredUrl.protocol === 'http:' &&
      !registeredUrl.hash &&
      registeredUrl.hostname === requestedUrl.hostname &&
      registeredUrl.pathname === requestedUrl.pathname &&
      registeredUrl.search === requestedUrl.search
    );
  }

  private parseClientMetadata(
    raw: unknown,
    expectedClientId: string
  ): OAuthClientMetadata {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new OAuthError(
        OAuthErrorCode.InvalidClientMetadata,
        'Client metadata must be a JSON object'
      );
    }

    const data = raw as Record<string, unknown>;

    if (data.client_id !== expectedClientId) {
      throw new OAuthError(
        OAuthErrorCode.InvalidClientMetadata,
        'Client metadata client_id does not match requested client_id'
      );
    }

    if (
      typeof data.client_name !== 'string' ||
      data.client_name.trim().length === 0
    ) {
      throw new OAuthError(
        OAuthErrorCode.InvalidClientMetadata,
        'Client metadata must include a non-empty client_name'
      );
    }

    if (
      !Array.isArray(data.redirect_uris) ||
      data.redirect_uris.length === 0 ||
      !data.redirect_uris.every((uri) => this.isValidRedirectUri(uri))
    ) {
      throw new OAuthError(
        OAuthErrorCode.InvalidClientMetadata,
        'Client metadata must include a non-empty array of valid redirect_uris'
      );
    }

    const grantTypes =
      data.grant_types === undefined
        ? ['authorization_code']
        : this.parseStringArray(data.grant_types, 'grant_types');

    const responseTypes =
      data.response_types === undefined
        ? ['code']
        : this.parseStringArray(data.response_types, 'response_types');

    let tokenEndpointAuthMethod: string | undefined;

    if (data.token_endpoint_auth_method !== undefined) {
      if (
        typeof data.token_endpoint_auth_method !== 'string' ||
        data.token_endpoint_auth_method.trim().length === 0
      ) {
        throw new OAuthError(
          OAuthErrorCode.InvalidClientMetadata,
          'Client metadata token_endpoint_auth_method must be a non-empty string'
        );
      }

      tokenEndpointAuthMethod = data.token_endpoint_auth_method;
    }

    return {
      client_id: data.client_id,
      client_name: data.client_name,
      grant_types: grantTypes,
      redirect_uris: data.redirect_uris,
      response_types: responseTypes,
      ...(tokenEndpointAuthMethod !== undefined
        ? { token_endpoint_auth_method: tokenEndpointAuthMethod }
        : {})
    };
  }

  private parseStringArray(value: unknown, fieldName: string): string[] {
    if (
      !Array.isArray(value) ||
      value.length === 0 ||
      !value.every((item) => typeof item === 'string' && item.trim().length > 0)
    ) {
      throw new OAuthError(
        OAuthErrorCode.InvalidClientMetadata,
        `Client metadata ${fieldName} must be a non-empty array of strings`
      );
    }

    return value as string[];
  }
}
