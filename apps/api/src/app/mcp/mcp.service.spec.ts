import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer, IncomingMessage, Server } from 'node:http';
import { AddressInfo } from 'node:net';

import { buildApiPath } from './mcp-api-client';
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

  it('advertises the tools as read-only together with instructions', async () => {
    const { tools } = await client.listTools();

    expect(tools).toHaveLength(MCP_TOOLS.length);
    expect(tools.every(({ annotations }) => annotations.readOnlyHint)).toBe(
      true
    );
    expect(client.getInstructions()).toContain('read-only');
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
    expect(await service.getAuthorizationToken(undefined)).toBeUndefined();
    expect(await service.getAuthorizationToken('Basic abc')).toBeUndefined();
  });

  it('passes a valid JWT through', async () => {
    expect(await service.getAuthorizationToken('Bearer a.b.c')).toBe('a.b.c');
  });

  it('rejects an invalid JWT', async () => {
    jwtService.verify.mockImplementationOnce(() => {
      throw new Error('invalid');
    });

    expect(await service.getAuthorizationToken('Bearer a.b.c')).toBeUndefined();
  });

  it('exchanges an API key for a short-lived JWT', async () => {
    apiKeyService.getUserByApiKey.mockResolvedValueOnce({ id: 'user-1' });

    expect(await service.getAuthorizationToken('Bearer key-123')).toBe(
      'minted-jwt'
    );
    expect(jwtService.sign).toHaveBeenCalledWith(
      { id: 'user-1' },
      { expiresIn: '10m' }
    );
  });

  it('exchanges the Security Token for a short-lived JWT', async () => {
    userService.users.mockResolvedValueOnce([{ id: 'user-2' }]);

    expect(await service.getAuthorizationToken('Bearer secret')).toBe(
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
    expect(await service.getAuthorizationToken('Bearer nope')).toBeUndefined();
  });
});
