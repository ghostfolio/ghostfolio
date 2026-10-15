import { UserService } from '@ghostfolio/api/app/user/user.service';

import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';

import { McpAuthService } from '../mcp-auth.service';
import { MCP_SCOPE, McpTokenService } from './mcp-token.service';
import { FormField } from './oauth-pages';
import {
  OAuthError,
  matchRedirectUri,
  validateRedirectUris,
  verifyPkce
} from './oauth-utils';
import { getResourceIdentifier } from './oauth.constants';

const AUTHORIZATION_CODE_TTL_MS = 5 * 60 * 1000;
const MAX_FAILED_CONSENT_ATTEMPTS = 10;
const FAILED_CONSENT_WINDOW_MS = 10 * 60 * 1000;

export interface AuthorizeRequest {
  clientId: string;
  clientName: string;
  codeChallenge: string;
  redirectUri: string;
  resource: string;
  scope: string;
  state: string;
}

interface AuthorizationCode extends AuthorizeRequest {
  expiresAt: number;
  userId: string;
}

@Injectable()
export class OAuthService {
  // Authorization codes live for five minutes and are single use, so keeping
  // them in memory is enough. A restart only costs an in-flight sign-in.
  private readonly codes = new Map<string, AuthorizationCode>();
  private readonly failedAttempts = new Map<
    string,
    { count: number; resetAt: number }
  >();

  public constructor(
    private readonly mcpAuthService: McpAuthService,
    private readonly mcpTokenService: McpTokenService,
    private readonly userService: UserService
  ) {}

  public getAuthorizationServerMetadata(baseUrl: string) {
    return {
      authorization_endpoint: `${baseUrl}/oauth/authorize`,
      code_challenge_methods_supported: ['S256'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      issuer: baseUrl,
      registration_endpoint: `${baseUrl}/oauth/register`,
      response_types_supported: ['code'],
      scopes_supported: [MCP_SCOPE],
      token_endpoint: `${baseUrl}/oauth/token`,
      token_endpoint_auth_methods_supported: ['none']
    };
  }

  public getProtectedResourceMetadata(baseUrl: string) {
    return {
      authorization_servers: [baseUrl],
      bearer_methods_supported: ['header'],
      resource: getResourceIdentifier(baseUrl),
      scopes_supported: [MCP_SCOPE]
    };
  }

  /** RFC 7591 dynamic client registration for public clients. */
  public registerClient(body: Record<string, unknown>) {
    validateRedirectUris(body?.redirect_uris);

    const authMethod = body.token_endpoint_auth_method;

    if (authMethod && authMethod !== 'none') {
      throw new OAuthError(
        'invalid_client_metadata',
        'only public clients (token_endpoint_auth_method=none) are supported'
      );
    }

    const clientName = String(body.client_name ?? '')
      .trim()
      .slice(0, 100);
    const issuedAt = Math.floor(Date.now() / 1000);

    return {
      client_id: this.mcpTokenService.encodeClientId({
        clientName,
        iat: issuedAt,
        redirectUris: body.redirect_uris as string[]
      }),
      client_id_issued_at: issuedAt,
      client_name: clientName,
      grant_types: ['authorization_code', 'refresh_token'],
      redirect_uris: body.redirect_uris,
      response_types: ['code'],
      token_endpoint_auth_method: 'none'
    };
  }

  public parseAuthorizeRequest(
    values: Record<string, unknown>,
    baseUrl: string
  ): AuthorizeRequest {
    const resourceIdentifier = getResourceIdentifier(baseUrl);
    const text = (name: string) =>
      typeof values[name] === 'string' ? (values[name] as string) : '';

    const clientId = text('client_id');
    let client: ReturnType<McpTokenService['decodeClientId']>;

    try {
      client = this.mcpTokenService.decodeClientId(clientId);
    } catch {
      throw new OAuthError('invalid_request', 'unknown client');
    }

    let redirectUri = text('redirect_uri');

    if (!redirectUri) {
      if (client.redirectUris.length !== 1) {
        throw new OAuthError('invalid_request', 'redirect_uri is required');
      }

      redirectUri = client.redirectUris[0];
    }

    if (!matchRedirectUri(client.redirectUris, redirectUri)) {
      throw new OAuthError(
        'invalid_request',
        'redirect_uri does not match the registered redirect URIs'
      );
    }

    if (text('response_type') !== 'code') {
      throw new OAuthError('invalid_request', 'unsupported response_type');
    }

    // The resource indicator binds the token to this MCP endpoint. A request
    // naming another resource is refused instead of silently rewritten, so a
    // client tricked into pointing here cannot obtain a token it would hand
    // to a different server.
    const resource = text('resource');

    if (resource && resource.replace(/\/+$/, '') !== resourceIdentifier) {
      throw new OAuthError(
        'invalid_target',
        'resource is not served by this authorization server'
      );
    }

    if (!text('code_challenge') || text('code_challenge_method') !== 'S256') {
      throw new OAuthError(
        'invalid_request',
        'PKCE with code_challenge_method=S256 is required'
      );
    }

    return {
      clientId,
      clientName: client.clientName ?? '',
      codeChallenge: text('code_challenge'),
      redirectUri,
      resource: resourceIdentifier,
      // Unknown scopes are ignored: there is a single read scope and it is
      // what gets granted (RFC 6749 §3.3 lets the server grant less).
      scope: MCP_SCOPE,
      state: text('state')
    };
  }

  public toFormFields(request: AuthorizeRequest): FormField[] {
    const fields: FormField[] = [
      { name: 'response_type', value: 'code' },
      { name: 'client_id', value: request.clientId },
      { name: 'redirect_uri', value: request.redirectUri },
      { name: 'resource', value: request.resource },
      { name: 'code_challenge', value: request.codeChallenge },
      { name: 'code_challenge_method', value: 'S256' }
    ];

    if (request.state) {
      fields.push({ name: 'state', value: request.state });
    }

    return fields;
  }

  /**
   * Verifies the credential typed into the consent form and, if valid, issues
   * the authorization code. Returns `undefined` for a wrong credential.
   */
  public async authorize({
    clientIp,
    credential,
    request
  }: {
    clientIp: string;
    credential: string;
    request: AuthorizeRequest;
  }): Promise<string | undefined> {
    if (this.isRateLimited(clientIp)) {
      throw new OAuthError(
        'access_denied',
        'too many failed attempts, try again later',
        429
      );
    }

    const userId = credential
      ? await this.mcpAuthService.getUserIdByCredential(credential)
      : undefined;

    if (!userId) {
      this.recordFailure(clientIp);

      return undefined;
    }

    const code = randomBytes(32).toString('base64url');

    this.pruneCodes();
    this.codes.set(code, {
      ...request,
      expiresAt: Date.now() + AUTHORIZATION_CODE_TTL_MS,
      userId
    });

    return code;
  }

  public async exchangeToken(form: Record<string, unknown>) {
    switch (form.grant_type) {
      case 'authorization_code':
        return this.exchangeAuthorizationCode(form);
      case 'refresh_token':
        return this.exchangeRefreshToken(form);
      default:
        throw new OAuthError(
          'unsupported_grant_type',
          'unsupported grant_type'
        );
    }
  }

  private async exchangeAuthorizationCode(form: Record<string, unknown>) {
    const code = this.codes.get(String(form.code ?? ''));

    // Single use: gone whether or not the rest of the request checks out
    this.codes.delete(String(form.code ?? ''));

    if (!code || code.expiresAt < Date.now()) {
      throw new OAuthError(
        'invalid_grant',
        'invalid or expired authorization code'
      );
    }

    if (code.clientId !== form.client_id) {
      throw new OAuthError(
        'invalid_grant',
        'code was issued to a different client'
      );
    }

    if (form.redirect_uri && form.redirect_uri !== code.redirectUri) {
      throw new OAuthError('invalid_grant', 'redirect_uri mismatch');
    }

    if (
      !verifyPkce({
        challenge: code.codeChallenge,
        verifier: String(form.code_verifier ?? '')
      })
    ) {
      throw new OAuthError('invalid_grant', 'PKCE verification failed');
    }

    if (
      form.resource &&
      String(form.resource).replace(/\/+$/, '') !== code.resource
    ) {
      throw new OAuthError('invalid_target', 'resource mismatch');
    }

    return this.issueTokenPair({
      clientId: code.clientId,
      resource: code.resource,
      scope: code.scope,
      userId: code.userId
    });
  }

  private async exchangeRefreshToken(form: Record<string, unknown>) {
    let claims: ReturnType<McpTokenService['verifyToken']>;

    try {
      claims = this.mcpTokenService.verifyToken(
        String(form.refresh_token ?? ''),
        'mcp_refresh'
      );
    } catch {
      throw new OAuthError('invalid_grant', 'invalid refresh token');
    }

    if (form.client_id && form.client_id !== claims.cid) {
      throw new OAuthError(
        'invalid_grant',
        'refresh token was issued to a different client'
      );
    }

    // The tokens are stateless, so the user record is the one thing that can
    // still invalidate a refresh token: deleting the account ends it.
    if (!(await this.userService.user({ id: claims.sub }))) {
      throw new OAuthError('invalid_grant', 'user not found');
    }

    return this.issueTokenPair({
      clientId: claims.cid,
      resource: claims.aud,
      scope: claims.scope,
      userId: claims.sub
    });
  }

  private issueTokenPair({
    clientId,
    resource,
    scope,
    userId
  }: {
    clientId: string;
    resource: string;
    scope: string;
    userId: string;
  }) {
    const common = { audience: resource, clientId, scope, userId };
    const access = this.mcpTokenService.signToken({
      ...common,
      use: 'mcp_access'
    });
    const refresh = this.mcpTokenService.signToken({
      ...common,
      use: 'mcp_refresh'
    });

    return {
      access_token: access.token,
      expires_in: access.expiresIn,
      refresh_token: refresh.token,
      scope,
      token_type: 'Bearer'
    };
  }

  private isRateLimited(clientIp: string) {
    const entry = this.failedAttempts.get(clientIp);

    return (
      !!entry &&
      entry.resetAt > Date.now() &&
      entry.count >= MAX_FAILED_CONSENT_ATTEMPTS
    );
  }

  private pruneCodes() {
    const now = Date.now();

    for (const [code, { expiresAt }] of this.codes) {
      if (expiresAt < now) {
        this.codes.delete(code);
      }
    }
  }

  private recordFailure(clientIp: string) {
    const now = Date.now();
    const entry = this.failedAttempts.get(clientIp);

    for (const [ip, { resetAt }] of this.failedAttempts) {
      if (resetAt < now) {
        this.failedAttempts.delete(ip);
      }
    }

    if (!entry || entry.resetAt < now) {
      this.failedAttempts.set(clientIp, {
        count: 1,
        resetAt: now + FAILED_CONSENT_WINDOW_MS
      });
    } else {
      entry.count += 1;
    }
  }
}
