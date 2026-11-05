import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';

import {
  getMcpAuthorizationServerMetadata,
  getMcpOAuthBaseUrl,
  getMcpProtectedResourceMetadataUrl,
  getMcpResourceUrl,
  isMcpOAuthEnabled
} from './mcp-oauth.helper';

describe('mcp-oauth.helper', () => {
  let configurationService: ConfigurationService;
  let mockConfig: Record<string, any>;

  beforeEach(() => {
    mockConfig = {
      ENABLE_FEATURE_MCP: true,
      ENABLE_FEATURE_MCP_OAUTH: true,
      ROOT_URL: 'http://localhost:3333'
    };

    configurationService = {
      get: jest.fn((key: string) => {
        return mockConfig[key];
      })
    } as unknown as ConfigurationService;
  });

  describe('getMcpAuthorizationServerMetadata', () => {
    it('returns RFC 8414 authorization server metadata', () => {
      mockConfig.ROOT_URL = 'http://localhost:3333/';

      expect(getMcpAuthorizationServerMetadata(configurationService)).toEqual({
        authorization_endpoint: 'http://localhost:3333/oauth/authorize',
        client_id_metadata_document_supported: true,
        code_challenge_methods_supported: ['S256'],
        grant_types_supported: ['authorization_code', 'refresh_token'],
        issuer: 'http://localhost:3333',
        response_types_supported: ['code'],
        token_endpoint: 'http://localhost:3333/api/v1/oauth/token',
        token_endpoint_auth_methods_supported: ['none']
      });
    });
  });

  describe('getMcpOAuthBaseUrl', () => {
    it('returns the root URL without trailing slashes', () => {
      mockConfig.ROOT_URL = 'https://ghostfol.io///';

      expect(getMcpOAuthBaseUrl(configurationService)).toBe(
        'https://ghostfol.io'
      );
    });
  });

  describe('getMcpProtectedResourceMetadataUrl', () => {
    it('returns the full protected resource metadata URL', () => {
      mockConfig.ROOT_URL = 'http://localhost:3333/';

      expect(getMcpProtectedResourceMetadataUrl(configurationService)).toBe(
        'http://localhost:3333/.well-known/oauth-protected-resource/mcp'
      );
    });
  });

  describe('getMcpResourceUrl', () => {
    it('returns the resource URL as a URL instance', () => {
      mockConfig.ROOT_URL = 'http://localhost:3333/';

      expect(getMcpResourceUrl(configurationService)).toEqual(
        new URL('http://localhost:3333/mcp')
      );
    });
  });

  describe('isMcpOAuthEnabled', () => {
    it('returns true when both ENABLE_FEATURE_MCP and ENABLE_FEATURE_MCP_OAUTH are true', () => {
      mockConfig.ENABLE_FEATURE_MCP = true;
      mockConfig.ENABLE_FEATURE_MCP_OAUTH = true;

      expect(isMcpOAuthEnabled(configurationService)).toBe(true);
    });

    it('returns false when ENABLE_FEATURE_MCP is false', () => {
      mockConfig.ENABLE_FEATURE_MCP = false;
      mockConfig.ENABLE_FEATURE_MCP_OAUTH = true;

      expect(isMcpOAuthEnabled(configurationService)).toBe(false);
    });

    it('returns false when ENABLE_FEATURE_MCP_OAUTH is false', () => {
      mockConfig.ENABLE_FEATURE_MCP = true;
      mockConfig.ENABLE_FEATURE_MCP_OAUTH = false;

      expect(isMcpOAuthEnabled(configurationService)).toBe(false);
    });
  });
});
