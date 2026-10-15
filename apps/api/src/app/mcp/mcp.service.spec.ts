import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer, IncomingMessage, Server } from 'node:http';
import { AddressInfo } from 'node:net';

import {
  assertRequestAllowed,
  buildApiBody,
  buildApiPath
} from './mcp-api-client';
import { McpAuthService } from './mcp-auth.service';
import { MCP_TOOLS } from './mcp-tools';
import { McpService } from './mcp.service';

describe('buildApiPath', () => {
  const tool = (name: string) => MCP_TOOLS.find((t) => t.name === name);

  it('substitutes path parameters and encodes them', () => {
    expect(
      buildApiPath({
        args: { dataSource: 'YAHOO', symbol: 'BRK/B' },
        tool: tool('get_holding')
      })
    ).toBe('/api/v1/portfolio/holding/YAHOO/BRK%2FB');
  });

  it('puts the remaining arguments into the query and skips empty ones', () => {
    expect(
      buildApiPath({
        args: { range: 'max', skip: 0, symbol: undefined, take: 50 },
        tool: tool('list_activities')
      })
    ).toBe('/api/v1/activities?range=max&skip=0&take=50');
  });

  it('uses the API version of the tool', () => {
    expect(
      buildApiPath({ args: {}, tool: tool('get_portfolio_performance') })
    ).toBe('/api/v2/portfolio/performance');
  });

  it('rejects a missing path parameter', () => {
    expect(() =>
      buildApiPath({ args: { symbol: 'AAPL' }, tool: tool('get_holding') })
    ).toThrow('Missing required path parameter "dataSource"');
  });
});

describe('MCP_TOOLS', () => {
  it('has unique names and only read endpoints without path leaks', () => {
    const names = MCP_TOOLS.map(({ name }) => name);

    expect(new Set(names).size).toBe(names.length);
    expect(names).toEqual(
      expect.arrayContaining([
        'get_investment_plan',
        'list_activities',
        'list_holdings'
      ])
    );
  });
});

describe('McpService', () => {
  let apiServer: Server;
  let received: IncomingMessage[];
  let responseBody: string;
  let responseStatus: number;
  let client: Client;

  beforeAll(async () => {
    apiServer = createServer((request, response) => {
      received.push(request);
      response.statusCode = responseStatus;
      response.setHeader('content-type', 'application/json');
      response.end(responseBody);
    });

    await new Promise<void>((resolve) =>
      apiServer.listen(0, '127.0.0.1', resolve)
    );
  });

  afterAll(() => {
    apiServer.close();
  });

  beforeEach(async () => {
    received = [];
    responseBody = JSON.stringify({ holdings: [{ symbol: 'AAPL' }] });
    responseStatus = 200;

    const service = new McpService({
      get: () => (apiServer.address() as AddressInfo).port
    } as any);

    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();

    await service
      .createServer({ authorizationToken: 'internal-jwt' })
      .connect(serverTransport);

    client = new Client({ name: 'test', version: '0.0.0' });
    await client.connect(clientTransport);
  });

  afterEach(async () => {
    await client.close();
  });

  it('advertises every tool as read-only except create_activity', async () => {
    const { tools } = await client.listTools();

    expect(tools).toHaveLength(MCP_TOOLS.length);
    expect(
      tools
        .filter(({ annotations }) => !annotations.readOnlyHint)
        .map(({ name }) => name)
    ).toEqual(['create_activity']);
    expect(client.getInstructions()).toContain('read-only except');
  });

  it('forwards a tool call to the API with the internal token', async () => {
    const result = await client.callTool({
      arguments: { range: '1y', symbol: 'AAPL' },
      name: 'list_holdings'
    });

    expect(received).toHaveLength(1);
    const url = new URL(received[0].url, 'http://localhost');

    expect(url.pathname).toBe('/api/v1/portfolio/holdings');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      range: '1y',
      symbol: 'AAPL'
    });
    expect(received[0].method).toBe('GET');
    expect(received[0].headers.authorization).toBe('Bearer internal-jwt');
    expect(result.isError).toBeFalsy();
    expect(JSON.parse((result.content as any)[0].text)).toEqual({
      holdings: [{ symbol: 'AAPL' }]
    });
  });

  it('reports an API failure as a tool error', async () => {
    responseBody = JSON.stringify({ message: 'Forbidden', statusCode: 403 });
    responseStatus = 403;

    const result = await client.callTool({
      arguments: {},
      name: 'get_investment_plan'
    });

    expect(result.isError).toBe(true);
    expect((result.content as any)[0].text).toBe('403 Forbidden');
  });

  it('replays create_activity as a POST with a JSON body', async () => {
    responseBody = JSON.stringify({ id: 'activity-1' });
    let body = '';

    apiServer.once('request', (request) => {
      request.on('data', (chunk) => (body += chunk));
    });

    const args = {
      accountId: 'tfsa',
      currency: 'CAD',
      dataSource: 'YAHOO',
      date: '2026-10-14',
      fee: 0,
      quantity: 10,
      symbol: 'XEF.TO',
      type: 'BUY',
      unitPrice: 38.5
    };
    const result = await client.callTool({
      arguments: args,
      name: 'create_activity'
    });

    expect(result.isError).toBeFalsy();
    expect(received).toHaveLength(1);
    expect(received[0].method).toBe('POST');
    expect(received[0].url).toBe('/api/v1/activities');
    expect(received[0].headers.authorization).toBe('Bearer internal-jwt');
    expect(received[0].headers['content-type']).toBe('application/json');
    expect(JSON.parse(body)).toEqual(args);
  });

  it('defaults the fee to 0 and rejects an invalid transaction before calling the API', async () => {
    let body = '';

    apiServer.once('request', (request) => {
      request.on('data', (chunk) => (body += chunk));
    });

    await client.callTool({
      arguments: {
        accountId: 'tfsa',
        currency: 'CAD',
        dataSource: 'YAHOO',
        date: '2026-10-14',
        quantity: 1,
        symbol: 'XEF.TO',
        type: 'BUY',
        unitPrice: 1
      },
      name: 'create_activity'
    });

    expect(JSON.parse(body).fee).toBe(0);

    const invalid = await client.callTool({
      arguments: { accountId: 'tfsa', quantity: -1, type: 'GIFT' },
      name: 'create_activity'
    });

    expect(invalid.isError).toBe(true);
    expect(received).toHaveLength(1);
  });

  it('passes an authorization failure of the API on as a tool error', async () => {
    responseBody = JSON.stringify({ message: 'Forbidden', statusCode: 403 });
    responseStatus = 403;

    const result = await client.callTool({
      arguments: {
        accountId: 'tfsa',
        currency: 'CAD',
        date: '2026-10-14',
        quantity: 1,
        symbol: 'XEF.TO',
        type: 'BUY',
        unitPrice: 1
      },
      name: 'create_activity'
    });

    expect(result.isError).toBe(true);
    expect((result.content as any)[0].text).toBe('403 Forbidden');
  });

  it('refuses a tool that tries to write to a non-allowlisted endpoint', async () => {
    const service = new McpService({ get: () => 1 } as any);
    const result = await service.executeTool({
      args: {},
      authorizationToken: 'internal-jwt',
      tool: {
        description: 'rogue',
        inputSchema: {},
        method: 'POST',
        name: 'rogue',
        path: '/account'
      }
    });

    expect(result.isError).toBe(true);
    expect((result.content as any)[0].text).toContain(
      'not allowed through MCP'
    );
    expect(received).toHaveLength(0);
  });

  it('refuses a response that is too large instead of truncating it', async () => {
    responseBody = JSON.stringify({ data: 'x'.repeat(250_000) });

    const result = await client.callTool({
      arguments: {},
      name: 'list_accounts'
    });

    expect(result.isError).toBe(true);
    expect((result.content as any)[0].text).toContain('too large');
  });
});

describe('write allowlist', () => {
  const tool = (name: string) => MCP_TOOLS.find((t) => t.name === name);

  it('allows only POST /api/v1/activities as a write', () => {
    expect(() =>
      assertRequestAllowed({ method: 'POST', path: '/api/v1/activities' })
    ).not.toThrow();

    for (const [method, path] of [
      ['POST', '/api/v1/account'],
      ['POST', '/api/v1/activities/import'],
      ['POST', '/api/v1/activities?x=1'],
      ['PUT', '/api/v1/activities/abc'],
      ['DELETE', '/api/v1/activities/abc'],
      ['POST', '/api/v1/investment-plan/ai-report']
    ]) {
      expect(() => assertRequestAllowed({ method, path })).toThrow(
        'is not allowed through MCP'
      );
    }
  });

  it('exposes exactly one tool that writes', () => {
    expect(
      MCP_TOOLS.filter(({ method }) => method === 'POST').map(
        ({ name }) => name
      )
    ).toEqual(['create_activity']);
  });

  it('sends the arguments of a POST tool as the body, not the query', () => {
    const args = { accountId: 'a1', symbol: 'XEF.TO', type: 'BUY' };

    expect(buildApiPath({ args, tool: tool('create_activity') })).toBe(
      '/api/v1/activities'
    );
    expect(buildApiBody({ args, tool: tool('create_activity') })).toEqual(args);
  });
});

const BASE_URL = 'https://example.com';

describe('McpAuthService', () => {
  const jwtService = {
    sign: jest.fn(() => 'minted-jwt'),
    verify: jest.fn()
  };
  const apiKeyService = { getUserByApiKey: jest.fn() };
  const userService = {
    createAccessToken: jest.fn(({ password }) => `hash(${password})`),
    users: jest.fn()
  };

  const service = new McpAuthService(
    apiKeyService as any,
    { get: () => 'salt' } as any,
    jwtService as any,
    {
      verifyToken: () => {
        throw new Error('not an oauth token');
      }
    } as any,
    userService as any
  );

  beforeEach(() => {
    jest.clearAllMocks();
    apiKeyService.getUserByApiKey.mockRejectedValue(new Error('not found'));
    userService.users.mockResolvedValue([]);
  });

  it('rejects a missing or non-bearer header', async () => {
    expect(
      await service.getAuthorizationToken(undefined, BASE_URL)
    ).toBeUndefined();
    expect(
      await service.getAuthorizationToken('Basic abc', BASE_URL)
    ).toBeUndefined();
  });

  it('passes a valid JWT through', async () => {
    expect(await service.getAuthorizationToken('Bearer a.b.c', BASE_URL)).toBe(
      'a.b.c'
    );
  });

  it('rejects an invalid JWT', async () => {
    jwtService.verify.mockImplementationOnce(() => {
      throw new Error('invalid');
    });

    expect(
      await service.getAuthorizationToken('Bearer a.b.c', BASE_URL)
    ).toBeUndefined();
  });

  it('exchanges an API key for a short-lived JWT', async () => {
    apiKeyService.getUserByApiKey.mockResolvedValueOnce({ id: 'user-1' });

    expect(
      await service.getAuthorizationToken('Bearer key-123', BASE_URL)
    ).toBe('minted-jwt');
    expect(jwtService.sign).toHaveBeenCalledWith(
      { id: 'user-1' },
      { expiresIn: '10m' }
    );
  });

  it('exchanges the Security Token for a short-lived JWT', async () => {
    userService.users.mockResolvedValueOnce([{ id: 'user-2' }]);

    expect(await service.getAuthorizationToken('Bearer secret', BASE_URL)).toBe(
      'minted-jwt'
    );
    expect(userService.users).toHaveBeenCalledWith({
      where: { accessToken: 'hash(secret)' }
    });
    expect(jwtService.sign).toHaveBeenCalledWith(
      { id: 'user-2' },
      { expiresIn: '10m' }
    );
  });

  it('rejects an unknown credential', async () => {
    expect(
      await service.getAuthorizationToken('Bearer nope', BASE_URL)
    ).toBeUndefined();
  });
});
