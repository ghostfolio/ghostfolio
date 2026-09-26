import type { RequestWithUser } from '@ghostfolio/common/types';

const PREFIX_OF_BEARER_TOKEN = 'bearer ';

/**
 * Gives the identifier of the access which the authorization header carries as
 * a bearer token. The scheme is compared without regard to the case, because
 * RFC 7235 defines it as case-insensitive.
 */
export function getAccessIdOfBearerToken(authorization?: string) {
  if (typeof authorization !== 'string') {
    return undefined;
  }

  const value = authorization.trim();

  return value.toLowerCase().startsWith(PREFIX_OF_BEARER_TOKEN)
    ? value.slice(PREFIX_OF_BEARER_TOKEN.length).trim() || undefined
    : undefined;
}

/**
 * Gives the context of the access which the authorization middleware of the
 * model context protocol resolved from the bearer token, but only while the
 * access is active
 */
export function getActiveImpersonationOfBearerToken(
  request?: Pick<RequestWithUser, 'impersonationOfBearerToken'>
) {
  return request?.impersonationOfBearerToken?.isActive
    ? request.impersonationOfBearerToken
    : undefined;
}

/**
 * Gives the user which the transport of the model context protocol evaluates
 * to list and to call the tools. It carries the scopes of the active access,
 * hence the transport lists only the tools which the access covers.
 */
export function getMcpUserOfBearerToken(request: unknown) {
  const impersonationOfBearerToken =
    getActiveImpersonationOfBearerToken(request);

  return impersonationOfBearerToken
    ? { scopes: impersonationOfBearerToken.scopes }
    : undefined;
}
