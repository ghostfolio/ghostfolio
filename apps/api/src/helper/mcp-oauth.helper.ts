import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { MCP_ENDPOINT } from '@ghostfolio/common/config';

/**
 * Gives the root URL without a trailing slash. The issuer and the resource in
 * the metadata have to be identical to the URL which the client uses.
 */
export function getMcpOAuthBaseUrl(configurationService: ConfigurationService) {
  return configurationService.get('ROOT_URL').replace(/\/+$/, '');
}

/**
 * Gives the URL of the protected resource metadata (RFC 9728) which the
 * challenge of the authorization middleware names
 */
export function getMcpProtectedResourceMetadataUrl(
  configurationService: ConfigurationService
) {
  return `${getMcpOAuthBaseUrl(configurationService)}/.well-known/oauth-protected-resource${MCP_ENDPOINT}`;
}

/**
 * Tells if the authorization with OAuth 2.1 is enabled. It depends on the
 * server of the Model Context Protocol (MCP).
 */
export function isMcpOAuthEnabled(configurationService: ConfigurationService) {
  return (
    configurationService.get('ENABLE_FEATURE_MCP') &&
    configurationService.get('ENABLE_FEATURE_MCP_OAUTH')
  );
}
