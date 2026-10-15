import { request } from 'node:http';

import { McpToolDefinition } from './mcp-tools';

export const MCP_MAX_RESPONSE_CHARACTERS = 200_000;

export interface McpApiResponse {
  body: string;
  statusCode: number;
}

export function buildApiPath({
  args,
  tool
}: {
  args: Record<string, unknown>;
  tool: McpToolDefinition;
}) {
  const pathParams = new Set(tool.pathParams ?? []);

  let path = tool.path;

  for (const name of pathParams) {
    const value = args[name];

    if (value === undefined || value === null || value === '') {
      throw new Error(`Missing required path parameter "${name}"`);
    }

    path = path.replace(`:${name}`, encodeURIComponent(String(value)));
  }

  const query = new URLSearchParams();

  for (const [name, value] of Object.entries(args)) {
    if (pathParams.has(name) || value === undefined || value === null) {
      continue;
    }

    query.set(name, Array.isArray(value) ? value.join(',') : String(value));
  }

  const queryString = query.toString();

  return `/api/v${tool.version ?? 1}${path}${queryString ? `?${queryString}` : ''}`;
}

/**
 * Runs a GET request against the API of this very process over the loopback
 * interface. `node:http` is used on purpose instead of `fetch`: the global
 * undici dispatcher honours HTTP_PROXY and must not be involved in a request
 * that never leaves the host.
 */
export function callLocalApi({
  authorizationToken,
  path,
  port
}: {
  authorizationToken: string;
  path: string;
  port: number;
}): Promise<McpApiResponse> {
  return new Promise((resolve, reject) => {
    const apiRequest = request(
      {
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${authorizationToken}`
        },
        host: '127.0.0.1',
        method: 'GET',
        path,
        port,
        timeout: 60_000
      },
      (response) => {
        const chunks: Buffer[] = [];

        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () =>
          resolve({
            body: Buffer.concat(chunks).toString('utf8'),
            statusCode: response.statusCode ?? 500
          })
        );
        response.on('error', reject);
      }
    );

    apiRequest.on('timeout', () => {
      apiRequest.destroy(new Error('Request to the Ghostfolio API timed out'));
    });
    apiRequest.on('error', reject);
    apiRequest.end();
  });
}
