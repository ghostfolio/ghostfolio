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
