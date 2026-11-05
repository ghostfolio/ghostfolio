import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';

import { NotFoundException } from '@nestjs/common';

import { OAuthMetadataController } from './oauth-metadata.controller';

describe('OAuthMetadataController', () => {
  let configurationService: ConfigurationService;
  let controller: OAuthMetadataController;
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

    controller = new OAuthMetadataController(configurationService);
  });

  describe('getProtectedResourceMetadata', () => {
    it('throws NotFoundException when ENABLE_FEATURE_MCP is false', () => {
      mockConfig.ENABLE_FEATURE_MCP = false;
      mockConfig.ENABLE_FEATURE_MCP_OAUTH = true;

      expect(() => {
        return controller.getProtectedResourceMetadata();
      }).toThrow(NotFoundException);
    });

    it('throws NotFoundException when ENABLE_FEATURE_MCP_OAUTH is false', () => {
      mockConfig.ENABLE_FEATURE_MCP = true;
      mockConfig.ENABLE_FEATURE_MCP_OAUTH = false;

      expect(() => {
        return controller.getProtectedResourceMetadata();
      }).toThrow(NotFoundException);
    });

    it('throws NotFoundException when ROOT_URL is not valid as the issuer', () => {
      mockConfig.ENABLE_FEATURE_MCP = true;
      mockConfig.ENABLE_FEATURE_MCP_OAUTH = true;
      mockConfig.ROOT_URL = 'http://0.0.0.0:3333';

      expect(() => {
        return controller.getProtectedResourceMetadata();
      }).toThrow(NotFoundException);
    });

    it('returns RFC 9728 protected resource metadata when feature flags are enabled', () => {
      mockConfig.ENABLE_FEATURE_MCP = true;
      mockConfig.ENABLE_FEATURE_MCP_OAUTH = true;
      mockConfig.ROOT_URL = 'http://localhost:3333';

      const result = controller.getProtectedResourceMetadata();

      expect(result).toEqual({
        authorization_servers: ['http://localhost:3333'],
        resource: 'http://localhost:3333/mcp',
        resource_name: 'Ghostfolio'
      });
    });

    it('normalizes ROOT_URL with trailing slash', () => {
      mockConfig.ENABLE_FEATURE_MCP = true;
      mockConfig.ENABLE_FEATURE_MCP_OAUTH = true;
      mockConfig.ROOT_URL = 'https://ghostfol.io///';

      const result = controller.getProtectedResourceMetadata();

      expect(result).toEqual({
        authorization_servers: ['https://ghostfol.io'],
        resource: 'https://ghostfol.io/mcp',
        resource_name: 'Ghostfolio'
      });
    });
  });

  describe('getAuthorizationServerMetadata', () => {
    it('throws NotFoundException when ENABLE_FEATURE_MCP is false', () => {
      mockConfig.ENABLE_FEATURE_MCP = false;
      mockConfig.ENABLE_FEATURE_MCP_OAUTH = true;

      expect(() => {
        return controller.getAuthorizationServerMetadata();
      }).toThrow(NotFoundException);
    });

    it('throws NotFoundException when ENABLE_FEATURE_MCP_OAUTH is false', () => {
      mockConfig.ENABLE_FEATURE_MCP = true;
      mockConfig.ENABLE_FEATURE_MCP_OAUTH = false;

      expect(() => {
        return controller.getAuthorizationServerMetadata();
      }).toThrow(NotFoundException);
    });

    it('throws NotFoundException when ROOT_URL is not valid as the issuer', () => {
      mockConfig.ENABLE_FEATURE_MCP = true;
      mockConfig.ENABLE_FEATURE_MCP_OAUTH = true;
      mockConfig.ROOT_URL = 'http://0.0.0.0:3333';

      expect(() => {
        return controller.getAuthorizationServerMetadata();
      }).toThrow(NotFoundException);
    });

    it('returns RFC 8414 authorization server metadata when feature flags are enabled', () => {
      mockConfig.ENABLE_FEATURE_MCP = true;
      mockConfig.ENABLE_FEATURE_MCP_OAUTH = true;
      mockConfig.ROOT_URL = 'http://localhost:3333';

      const result = controller.getAuthorizationServerMetadata();

      expect(result).toEqual({
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

    it('normalizes ROOT_URL with trailing slash', () => {
      mockConfig.ENABLE_FEATURE_MCP = true;
      mockConfig.ENABLE_FEATURE_MCP_OAUTH = true;
      mockConfig.ROOT_URL = 'https://ghostfol.io/';

      const result = controller.getAuthorizationServerMetadata();

      expect(result).toEqual({
        authorization_endpoint: 'https://ghostfol.io/oauth/authorize',
        client_id_metadata_document_supported: true,
        code_challenge_methods_supported: ['S256'],
        grant_types_supported: ['authorization_code', 'refresh_token'],
        issuer: 'https://ghostfol.io',
        response_types_supported: ['code'],
        token_endpoint: 'https://ghostfol.io/api/v1/oauth/token',
        token_endpoint_auth_methods_supported: ['none']
      });
    });
  });
});
