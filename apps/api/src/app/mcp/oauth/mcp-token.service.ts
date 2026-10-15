import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHmac, timingSafeEqual } from 'node:crypto';

export const MCP_SCOPE = 'mcp';

export const MCP_ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
export const MCP_REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

const CLIENT_ID_PREFIX = 'mcpc_';

export interface McpClientMetadata {
  clientName?: string;
  iat: number;
  redirectUris: string[];
}

export interface McpTokenClaims {
  aud: string;
  cid: string;
  scope: string;
  sub: string;
  use: 'mcp_access' | 'mcp_refresh';
}

/**
 * Signs and verifies everything the OAuth flow hands out. All of it is
 * stateless and keyed with a secret derived from JWT_SECRET_KEY, so:
 *
 * - MCP tokens are never valid Ghostfolio API JWTs (and vice versa), even
 *   though both are JWTs: the regular API only trusts the primary key.
 * - dynamically registered clients need no table. The client_id is the
 *   signed client metadata, like in ToucanShelf.
 */
@Injectable()
export class McpTokenService {
  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly jwtService: JwtService
  ) {}

  public decodeClientId(clientId: string): McpClientMetadata {
    if (!clientId?.startsWith(CLIENT_ID_PREFIX)) {
      throw new Error('unknown client_id');
    }

    const [encoded, signature] = clientId
      .slice(CLIENT_ID_PREFIX.length)
      .split('.');

    if (
      !encoded ||
      !signature ||
      !this.safeEqual(signature, this.sign(encoded))
    ) {
      throw new Error('client_id signature mismatch');
    }

    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  }

  public encodeClientId(metadata: McpClientMetadata) {
    const encoded = Buffer.from(JSON.stringify(metadata)).toString('base64url');

    return `${CLIENT_ID_PREFIX}${encoded}.${this.sign(encoded)}`;
  }

  public signToken({
    audience,
    clientId,
    scope,
    use,
    userId
  }: {
    audience: string;
    clientId: string;
    scope: string;
    use: McpTokenClaims['use'];
    userId: string;
  }) {
    const expiresIn =
      use === 'mcp_access'
        ? MCP_ACCESS_TOKEN_TTL_SECONDS
        : MCP_REFRESH_TOKEN_TTL_SECONDS;

    const token = this.jwtService.sign(
      { aud: audience, cid: clientId, scope, sub: userId, use },
      { expiresIn, secret: this.secret }
    );

    return { expiresIn, token };
  }

  /** Throws if the token is invalid, expired or of the wrong kind. */
  public verifyToken(
    token: string,
    use: McpTokenClaims['use']
  ): McpTokenClaims {
    const claims = this.jwtService.verify<McpTokenClaims>(token, {
      secret: this.secret
    });

    if (claims.use !== use) {
      throw new Error('wrong token type');
    }

    return claims;
  }

  private get secret() {
    return createHmac('sha256', this.configurationService.get('JWT_SECRET_KEY'))
      .update('ghostfolio-mcp-oauth')
      .digest('hex');
  }

  private safeEqual(a: string, b: string) {
    const bufferA = Buffer.from(a);
    const bufferB = Buffer.from(b);

    return (
      bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB)
    );
  }

  private sign(payload: string) {
    return createHmac('sha256', this.secret)
      .update(payload)
      .digest('base64url');
  }
}
