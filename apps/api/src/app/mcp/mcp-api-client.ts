import { request } from 'node:http';

import { McpToolDefinition } from './mcp-tools';

export const MCP_MAX_RESPONSE_CHARACTERS = 200_000;

/**
 * The only requests that may change data, as `METHOD /path`. Everything else
 * must be a GET. This is checked where the request is sent, so a tool
 * definition cannot open another write endpoint by accident: adding one means
 * editing this list on purpose.
 */
export const MCP_ALLOWED_WRITES = ['POST /api/v1/activities'];

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

  if (tool.method === 'POST') {
    // Arguments travel in the body, see buildApiBody
    return `/api/v${tool.version ?? 1}${path}`;
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

export function buildApiBody({
  args,
  tool
}: {
  args: Record<string, unknown>;
  tool: McpToolDefinition;
}) {
  const pathParams = new Set(tool.pathParams ?? []);

  return Object.fromEntries(
    Object.entries(args).filter(
      ([name, value]) => !pathParams.has(name) && value !== undefined
    )
  );
}

export function assertRequestAllowed({
  method,
  path
}: {
  method: string;
  path: string;
}) {
  if (method !== 'GET' && !MCP_ALLOWED_WRITES.includes(`${method} ${path}`)) {
    throw new Error(`${method} ${path} is not allowed through MCP`);
  }
}

/**
 * Runs a request against the API of this very process over the loopback
 * interface. `node:http` is used on purpose instead of `fetch`: the global
 * undici dispatcher honours HTTP_PROXY and must not be involved in a request
 * that never leaves the host.
 */
export function callLocalApi({
  authorizationToken,
  body,
  method = 'GET',
  path,
  port
}: {
  authorizationToken: string;
  body?: Record<string, unknown>;
  method?: 'GET' | 'POST';
  path: string;
  port: number;
}): Promise<McpApiResponse> {
  return new Promise((resolve, reject) => {
    try {
      assertRequestAllowed({ method, path });
    } catch (error) {
      return reject(error);
    }

    const payload = method === 'GET' ? undefined : JSON.stringify(body ?? {});

    const apiRequest = request(
      {
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${authorizationToken}`,
          ...(payload === undefined
            ? {}
            : {
                'content-length': Buffer.byteLength(payload),
                'content-type': 'application/json'
              })
        },
        host: '127.0.0.1',
        method,
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
    apiRequest.end(payload);
  });
}
