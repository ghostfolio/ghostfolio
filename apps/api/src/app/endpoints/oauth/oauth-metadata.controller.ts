import {
  getMcpOAuthBaseUrl,
  isMcpOAuthEnabled
} from '@ghostfolio/api/helper/mcp-oauth.helper';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { MCP_ENDPOINT } from '@ghostfolio/common/config';

import {
  Controller,
  Get,
  NotFoundException,
  VERSION_NEUTRAL,
  Version
} from '@nestjs/common';

@Controller('.well-known')
export class OAuthMetadataController {
  public constructor(
    private readonly configurationService: ConfigurationService
  ) {}

  @Get(`oauth-protected-resource${MCP_ENDPOINT}`)
  @Version(VERSION_NEUTRAL)
  public getProtectedResourceMetadata() {
    if (!isMcpOAuthEnabled(this.configurationService)) {
      throw new NotFoundException();
    }

    const rootUrl = getMcpOAuthBaseUrl(this.configurationService);

    return {
      authorization_servers: [rootUrl],
      bearer_methods_supported: ['header'],
      resource: `${rootUrl}${MCP_ENDPOINT}`,
      resource_name: 'Ghostfolio'
    };
  }

  @Get('oauth-authorization-server')
  @Version(VERSION_NEUTRAL)
  public getAuthorizationServerMetadata() {
    if (!isMcpOAuthEnabled(this.configurationService)) {
      throw new NotFoundException();
    }

    const rootUrl = getMcpOAuthBaseUrl(this.configurationService);

    return {
      authorization_endpoint: `${rootUrl}/oauth/authorize`,
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
