import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';

import {
  getMcpOAuthBaseUrl,
  getMcpProtectedResourceMetadataUrl,
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
