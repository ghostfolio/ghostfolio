import { UserService } from '@ghostfolio/api/app/user/user.service';
import { ApiKeyService } from '@ghostfolio/api/services/api-key/api-key.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class McpAuthService {
  public constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly configurationService: ConfigurationService,
    private readonly jwtService: JwtService,
    private readonly userService: UserService
  ) {}

  /**
   * Turns the credential of an MCP request into a JWT for the internal API
   * calls. Accepted bearer credentials, in this order:
   *
   * 1. a Ghostfolio JWT (the one the web client uses),
   * 2. an API key (Premium only, generated in the membership page),
   * 3. the Security Token the user logs in with.
   *
   * Returns `undefined` if the credential is missing or invalid.
   */
  public async getAuthorizationToken(
    authorizationHeader?: string
  ): Promise<string | undefined> {
    const credential = /^Bearer\s+(.+)$/i.exec(authorizationHeader ?? '')?.[1];

    if (!credential) {
      return undefined;
    }

    if (credential.split('.').length === 3) {
      try {
        this.jwtService.verify(credential);

        return credential;
      } catch {
        return undefined;
      }
    }

    const userId =
      (await this.getUserIdByApiKey(credential)) ??
      (await this.getUserIdBySecurityToken(credential));

    if (!userId) {
      return undefined;
    }

    // Short-lived: it only has to survive the tool calls of this request
    return this.jwtService.sign({ id: userId }, { expiresIn: '10m' });
  }

  private async getUserIdByApiKey(apiKey: string) {
    try {
      const user = await this.apiKeyService.getUserByApiKey(apiKey);

      return user?.id;
    } catch {
      return undefined;
    }
  }

  private async getUserIdBySecurityToken(securityToken: string) {
    try {
      const [user] = await this.userService.users({
        where: {
          accessToken: this.userService.createAccessToken({
            password: securityToken,
            salt: this.configurationService.get('ACCESS_TOKEN_SALT')
          })
        }
      });

      return user?.id;
    } catch {
      return undefined;
    }
  }
}
