import {
  getMcpAuthorizationServerMetadata,
  getMcpResourceUrl,
  isMcpOAuthEnabled
} from '@ghostfolio/api/helper/mcp-oauth.helper';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { MCP_ENDPOINT } from '@ghostfolio/common/config';

import { buildOAuthProtectedResourceMetadata } from '@modelcontextprotocol/server';
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

    return buildOAuthProtectedResourceMetadata({
      oauthMetadata: getMcpAuthorizationServerMetadata(
        this.configurationService
      ),
      resourceName: 'Ghostfolio',
      resourceServerUrl: getMcpResourceUrl(this.configurationService)
    });
  }

  @Get('oauth-authorization-server')
  @Version(VERSION_NEUTRAL)
  public getAuthorizationServerMetadata() {
    if (!isMcpOAuthEnabled(this.configurationService)) {
      throw new NotFoundException();
    }

    return getMcpAuthorizationServerMetadata(this.configurationService);
  }
}
