import type { Request } from 'express';

export const MCP_RESOURCE_PATH = '/api/v1/mcp';

/**
 * The externally reachable origin of this instance. An explicit ROOT_URL wins.
 * Without one it is derived from the request (forwarded headers first, as the
 * app usually sits behind a reverse proxy): ROOT_URL's built-in default is the
 * listen address, which is never reachable from a client.
 */
export function getBaseUrl(request: Request) {
  if (process.env.ROOT_URL) {
    return process.env.ROOT_URL.replace(/\/+$/, '');
  }

  const first = (value?: string | string[]) =>
    (Array.isArray(value) ? value[0] : value)?.split(',')[0].trim();

  const protocol =
    first(request.headers['x-forwarded-proto']) || request.protocol;
  const host =
    first(request.headers['x-forwarded-host']) || request.get('host');

  return `${protocol}://${host}`;
}

export function getResourceIdentifier(baseUrl: string) {
  return `${baseUrl}${MCP_RESOURCE_PATH}`;
}
