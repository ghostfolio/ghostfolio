import { UserService } from '@ghostfolio/api/app/user/user.service';
import { ApiKeyService } from '@ghostfolio/api/services/api-key/api-key.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { INestApplication, VersioningType } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { createHash } from 'node:crypto';
import { createServer, Server } from 'node:http';
import { AddressInfo } from 'node:net';

import { McpAuthService } from '../mcp-auth.service';
import { McpController } from '../mcp.controller';
import { McpService } from '../mcp.service';
import { McpTokenService } from './mcp-token.service';
import { OAuthController } from './oauth.controller';
import { OAuthService } from './oauth.service';

const REDIRECT_URI = 'http://127.0.0.1:53682/callback';
const VERIFIER = 'a-code-verifier-of-sufficient-length-0123456789';
const CHALLENGE = createHash('sha256').update(VERIFIER).digest('base64url');

describe('MCP OAuth', () => {
  let app: INestApplication;
  let apiServer: Server;
  let apiAuthorization: string;
  let origin: string;
  let jwtService: JwtService;
  let userExists = true;

  const form = (values: Record<string, string>) => ({
    body: new URLSearchParams(values).toString(),
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    method: 'POST'
  });

  async function registerClient() {
    const response = await fetch(`${origin}/oauth/register`, {
      body: JSON.stringify({
        client_name: 'Claude <b>',
        redirect_uris: [REDIRECT_URI]
      }),
      headers: { 'content-type': 'application/json' },
      method: 'POST'
    });

    return { body: await response.json(), status: response.status };
  }

  const authorizeQuery = (clientId: string, extra = {}) =>
    new URLSearchParams({
      client_id: clientId,
      code_challenge: CHALLENGE,
      code_challenge_method: 'S256',
      redirect_uri: REDIRECT_URI,
      resource: `${origin}/api/v1/mcp`,
      response_type: 'code',
      state: 'xyz',
      ...extra
    });

  async function obtainCode(clientId: string) {
    const response = await fetch(`${origin}/oauth/authorize`, {
      ...form({
        ...Object.fromEntries(authorizeQuery(clientId)),
        credential: 'my-security-token',
        decision: 'allow'
      }),
      redirect: 'manual'
    });

    return { location: response.headers.get('location'), response };
  }

  beforeAll(async () => {
    apiServer = createServer((request, response) => {
      apiAuthorization = request.headers.authorization;
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ capitalPool: 100000 }));
    });
    await new Promise<void>((resolve) =>
      apiServer.listen(0, '127.0.0.1', resolve)
    );

    const configuration = {
      ACCESS_TOKEN_SALT: 'salt',
      JWT_SECRET_KEY: 'test-secret',
      PORT: (apiServer.address() as AddressInfo).port,
      ROOT_URL: ''
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [McpController, OAuthController],
      imports: [JwtModule.register({ secret: 'test-secret' })],
      providers: [
        McpAuthService,
        McpService,
        McpTokenService,
        OAuthService,
        {
          provide: ConfigurationService,
          useValue: { get: (key: string) => configuration[key] }
        },
        {
          provide: ApiKeyService,
          useValue: { getUserByApiKey: async () => undefined }
        },
        {
          provide: UserService,
          useValue: {
            createAccessToken: ({ password }) => `hash:${password}`,
            user: async ({ id }) => (userExists ? { id } : undefined),
            users: async ({ where }) =>
              where.accessToken === 'hash:my-security-token'
                ? [{ id: 'user-1' }]
                : []
          }
        }
      ]
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api', {
      exclude: [
        '.well-known/oauth-authorization-server{/*wildcard}',
        '.well-known/oauth-protected-resource{/*wildcard}',
        'oauth/{*wildcard}'
      ]
    });
    app.enableVersioning({ defaultVersion: '1', type: VersioningType.URI });
    await app.listen(0, '127.0.0.1');

    origin = (await app.getUrl()).replace('[::1]', '127.0.0.1');
    configuration.ROOT_URL = origin;
    jwtService = moduleRef.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
    apiServer.close();
  });

  it('publishes discovery metadata at the origin root', async () => {
    const resource = await (
      await fetch(`${origin}/.well-known/oauth-protected-resource`)
    ).json();
    const server = await (
      await fetch(`${origin}/.well-known/oauth-authorization-server`)
    ).json();

    expect(resource.resource).toBe(`${origin}/api/v1/mcp`);
    expect(resource.authorization_servers).toEqual([origin]);
    expect(server.token_endpoint).toBe(`${origin}/oauth/token`);
    expect(server.code_challenge_methods_supported).toEqual(['S256']);
  });

  it('challenges an unauthenticated MCP request with the metadata URL', async () => {
    const response = await fetch(`${origin}/api/v1/mcp`, {
      body: JSON.stringify({ id: 1, jsonrpc: '2.0', method: 'tools/list' }),
      headers: {
        accept: 'application/json, text/event-stream',
        'content-type': 'application/json'
      },
      method: 'POST'
    });

    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toBe(
      `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"`
    );
  });

  it('runs the full flow: register, consent, token, MCP call, refresh', async () => {
    const { body: client, status } = await registerClient();

    expect(status).toBe(201);

    // Consent page escapes the client name
    const page = await (
      await fetch(
        `${origin}/oauth/authorize?${authorizeQuery(client.client_id)}`
      )
    ).text();

    expect(page).toContain('Claude &lt;b&gt;');
    expect(page).not.toContain('Claude <b>');

    const { location } = await obtainCode(client.client_id);
    const redirect = new URL(location);

    expect(redirect.origin + redirect.pathname).toBe(REDIRECT_URI);
    expect(redirect.searchParams.get('state')).toBe('xyz');

    const tokenResponse = await fetch(`${origin}/oauth/token`, {
      ...form({
        client_id: client.client_id,
        code: redirect.searchParams.get('code'),
        code_verifier: VERIFIER,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI
      })
    });
    const tokens = await tokenResponse.json();

    expect(tokenResponse.status).toBe(200);
    expect(tokens.token_type).toBe('Bearer');

    // The MCP token works on /mcp ...
    const mcpClient = new Client({ name: 'test', version: '0.0.0' });

    await mcpClient.connect(
      new StreamableHTTPClientTransport(new URL(`${origin}/api/v1/mcp`), {
        requestInit: {
          headers: { Authorization: `Bearer ${tokens.access_token}` }
        }
      })
    );
    await mcpClient.callTool({ arguments: {}, name: 'get_investment_plan' });
    await mcpClient.close();

    // ... is exchanged for a regular API JWT of the same user ...
    expect(jwtService.verify(apiAuthorization.slice('Bearer '.length))).toEqual(
      expect.objectContaining({ id: 'user-1' })
    );

    // ... and is worthless as a Ghostfolio API JWT itself.
    expect(() => jwtService.verify(tokens.access_token)).toThrow();

    // Refresh yields a working access token
    const refreshed = await (
      await fetch(`${origin}/oauth/token`, {
        ...form({
          client_id: client.client_id,
          grant_type: 'refresh_token',
          refresh_token: tokens.refresh_token
        })
      })
    ).json();

    expect(refreshed.access_token).toBeTruthy();

    // An access token is not a refresh token
    const misuse = await fetch(`${origin}/oauth/token`, {
      ...form({
        grant_type: 'refresh_token',
        refresh_token: tokens.access_token
      })
    });

    expect(misuse.status).toBe(400);
  });

  it('refuses a refresh token once the user is gone', async () => {
    const { body: client } = await registerClient();
    const code = new URL((await obtainCode(client.client_id)).location);
    const tokens = await (
      await fetch(`${origin}/oauth/token`, {
        ...form({
          client_id: client.client_id,
          code: code.searchParams.get('code'),
          code_verifier: VERIFIER,
          grant_type: 'authorization_code'
        })
      })
    ).json();

    userExists = false;

    const response = await fetch(`${origin}/oauth/token`, {
      ...form({
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh_token
      })
    });

    userExists = true;

    expect(response.status).toBe(400);
  });

  it('accepts an authorization code only once and only with the right verifier', async () => {
    const { body: client } = await registerClient();
    const code = new URL(
      (await obtainCode(client.client_id)).location
    ).searchParams.get('code');

    const wrongVerifier = await fetch(`${origin}/oauth/token`, {
      ...form({
        client_id: client.client_id,
        code,
        code_verifier: 'not-the-verifier',
        grant_type: 'authorization_code'
      })
    });

    expect(wrongVerifier.status).toBe(400);

    // The failed attempt burned the code
    const retry = await fetch(`${origin}/oauth/token`, {
      ...form({
        client_id: client.client_id,
        code,
        code_verifier: VERIFIER,
        grant_type: 'authorization_code'
      })
    });

    expect(retry.status).toBe(400);
  });

  it('rejects a wrong Security Token on the consent form without issuing a code', async () => {
    const { body: client } = await registerClient();
    const response = await fetch(`${origin}/oauth/authorize`, {
      ...form({
        ...Object.fromEntries(authorizeQuery(client.client_id)),
        credential: 'wrong',
        decision: 'allow'
      }),
      redirect: 'manual'
    });

    expect(response.status).toBe(401);
    expect(await response.text()).toContain('not valid');
  });

  it('redirects with access_denied when the user denies', async () => {
    const { body: client } = await registerClient();
    const response = await fetch(`${origin}/oauth/authorize`, {
      ...form({
        ...Object.fromEntries(authorizeQuery(client.client_id)),
        decision: 'deny'
      }),
      redirect: 'manual'
    });

    expect(
      new URL(response.headers.get('location')).searchParams.get('error')
    ).toBe('access_denied');
  });

  it('refuses a foreign resource, a foreign redirect_uri and missing PKCE', async () => {
    const { body: client } = await registerClient();

    for (const extra of [
      { resource: 'https://evil.example/mcp' },
      { redirect_uri: 'https://evil.example/cb' },
      { code_challenge: '' }
    ]) {
      const response = await fetch(
        `${origin}/oauth/authorize?${authorizeQuery(client.client_id, extra)}`,
        { redirect: 'manual' }
      );

      expect(response.status).toBe(400);
    }
  });

  it('refuses to register a plain-http, non-loopback redirect_uri', async () => {
    const response = await fetch(`${origin}/oauth/register`, {
      body: JSON.stringify({ redirect_uris: ['http://evil.example/cb'] }),
      headers: { 'content-type': 'application/json' },
      method: 'POST'
    });

    expect(response.status).toBe(400);
  });
});
