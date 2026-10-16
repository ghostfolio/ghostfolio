import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { INestApplication, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createServer, Server } from 'node:http';
import { AddressInfo } from 'node:net';

import { McpAuthService } from './mcp-auth.service';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';

describe('McpController', () => {
  // Starts an HTTP server and a real client; the default 5 s is too tight when
  // the whole suite runs in parallel
  jest.setTimeout(30000);

  let app: INestApplication;
  let apiServer: Server;
  let apiAuthorization: string;
  let baseUrl: URL;

  beforeAll(async () => {
    apiServer = createServer((request, response) => {
      apiAuthorization = request.headers.authorization;
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ capitalPool: 100000 }));
    });
    await new Promise<void>((resolve) =>
      apiServer.listen(0, '127.0.0.1', resolve)
    );

    const moduleRef = await Test.createTestingModule({
      controllers: [McpController],
      providers: [
        McpService,
        {
          provide: McpAuthService,
          useValue: {
            getAuthorizationToken: async (header?: string) =>
              header === 'Bearer good' ? 'internal-jwt' : undefined
          }
        },
        {
          provide: ConfigurationService,
          useValue: { get: () => (apiServer.address() as AddressInfo).port }
        }
      ]
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ defaultVersion: '1', type: VersioningType.URI });
    await app.listen(0, '127.0.0.1');

    baseUrl = new URL(`${await app.getUrl()}/api/v1/mcp`);
  });

  afterAll(async () => {
    await app.close();
    apiServer.close();
  });

  it('serves tools over streamable HTTP for an authorized client', async () => {
    const client = new Client({ name: 'test', version: '0.0.0' });

    await client.connect(
      new StreamableHTTPClientTransport(baseUrl, {
        requestInit: { headers: { Authorization: 'Bearer good' } }
      })
    );

    const { tools } = await client.listTools();

    expect(tools.map(({ name }) => name)).toContain('get_investment_plan');

    const result = await client.callTool({
      arguments: {},
      name: 'get_investment_plan'
    });

    expect(JSON.parse((result.content as any)[0].text)).toEqual({
      capitalPool: 100000
    });
    expect(apiAuthorization).toBe('Bearer internal-jwt');

    await client.close();
  });

  it('rejects an unauthorized request with 401', async () => {
    const response = await fetch(baseUrl, {
      body: JSON.stringify({ id: 1, jsonrpc: '2.0', method: 'tools/list' }),
      headers: {
        accept: 'application/json, text/event-stream',
        authorization: 'Bearer bad',
        'content-type': 'application/json'
      },
      method: 'POST'
    });

    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toBe(
      `Bearer resource_metadata="${baseUrl.origin}/.well-known/oauth-protected-resource"`
    );
  });

  it('does not let an unauthenticated client call create_activity', async () => {
    apiAuthorization = 'untouched';

    const response = await fetch(baseUrl, {
      body: JSON.stringify({
        id: 1,
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { arguments: {}, name: 'create_activity' }
      }),
      headers: {
        accept: 'application/json, text/event-stream',
        authorization: 'Bearer bad',
        'content-type': 'application/json'
      },
      method: 'POST'
    });

    expect(response.status).toBe(401);
    expect(apiAuthorization).toBe('untouched');
  });

  it('answers GET with 405 because the server is stateless', async () => {
    const response = await fetch(baseUrl, {
      headers: { authorization: 'Bearer good' }
    });

    expect(response.status).toBe(405);
  });
});
