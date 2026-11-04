import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { MCP_ENDPOINT } from '@ghostfolio/common/config';

import {
  Controller,
  Get,
  Header,
  NotFoundException,
  VERSION_NEUTRAL,
  Version
} from '@nestjs/common';

@Controller('.well-known')
export class OAuthMetadataController {
  public constructor(
    private readonly configurationService: ConfigurationService
  ) {}

  @Get('oauth-protected-resource/mcp')
  @Header('Cache-Control', 'public, max-age=3600')
  @Version(VERSION_NEUTRAL)
  public getProtectedResourceMetadata() {
    if (
      !this.configurationService.get('ENABLE_FEATURE_MCP') ||
      !this.configurationService.get('ENABLE_FEATURE_MCP_OAUTH')
    ) {
      throw new NotFoundException();
    }

    const rootUrl = (this.configurationService.get('ROOT_URL') || '').replace(
      /\/+$/,
      ''
    );

    return {
      authorization_servers: [rootUrl],
      bearer_methods_supported: ['header'],
      resource: `${rootUrl}${MCP_ENDPOINT}`,
      resource_name: 'Ghostfolio'
    };
  }

  @Get('oauth-authorization-server')
  @Header('Cache-Control', 'public, max-age=3600')
  @Version(VERSION_NEUTRAL)
  public getAuthorizationServerMetadata() {
    if (
      !this.configurationService.get('ENABLE_FEATURE_MCP') ||
      !this.configurationService.get('ENABLE_FEATURE_MCP_OAUTH')
    ) {
      throw new NotFoundException();
    }

    const rootUrl = (this.configurationService.get('ROOT_URL') || '').replace(
      /\/+$/,
      ''
    );

    return {
      authorization_endpoint: `${rootUrl}/oauth/authorize`,
      authorization_response_iss_parameter_supported: true,
      client_id_metadata_document_supported: true,
      code_challenge_methods_supported: ['S256'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      issuer: rootUrl,
      response_types_supported: ['code'],
      token_endpoint: `${rootUrl}/api/v1/oauth/token`,
      token_endpoint_auth_methods_supported: ['none']
    };
  }
}
