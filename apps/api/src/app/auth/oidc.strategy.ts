import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Provider } from '@prisma/client';
import { Request } from 'express';
import { Strategy, type StrategyOptions } from 'passport-openidconnect';

import { AuthService } from './auth.service';
import {
  OidcContext,
  OidcIdToken,
  OidcParams,
  OidcProfile,
  OidcValidationResult
} from './interfaces/interfaces';
import { OidcStateStore } from './oidc-state.store';

@Injectable()
export class OidcStrategy extends PassportStrategy(Strategy, 'oidc') {
  public constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    stateStore: OidcStateStore,
    options: StrategyOptions
  ) {
    super({
      ...options,
      passReqToCallback: true,
      store: stateStore
    });
  }

  public async validate(
    request: Request,
    issuer: string,
    profile: OidcProfile,
    context: OidcContext,
    idToken: OidcIdToken,
    _accessToken: string,
    _refreshToken: string,
    params: OidcParams
  ) {
    try {
      const thirdPartyId =
        profile?.id ??
        profile?.sub ??
        idToken?.sub ??
        params?.sub ??
        context?.claims?.sub;

      if (!thirdPartyId) {
        Logger.error(
          `Missing subject identifier in OIDC response from ${issuer}`,
          'OidcStrategy'
        );

        throw new Error('Missing subject identifier in OIDC response');
      }

      // Check if user is already authenticated via JWT
      // If authenticated, this is a link operation; otherwise, normal login
      // The linkToken is attached by OidcStateStore.verify() from the OAuth state
      const linkToken = (request as any).oidcLinkToken as string | undefined;
      const authenticatedUserId = this.extractAuthenticatedUserId(linkToken);

      if (authenticatedUserId) {
        // User is authenticated → Link mode
        // Return linkState for controller to handle linking
        return {
          linkState: {
            userId: authenticatedUserId
          },
          thirdPartyId
        } as OidcValidationResult;
      }

      // No authenticated user → Normal OIDC login flow
      const jwt = await this.authService.validateOAuthLogin({
        thirdPartyId,
        provider: Provider.OIDC
      });

      return { jwt, thirdPartyId } as OidcValidationResult;
    } catch (error) {
      Logger.error(error, 'OidcStrategy');
      throw error;
    }
  }

  /**
   * Extract authenticated user ID from linkToken passed via OAuth state
   */
  private extractAuthenticatedUserId(linkToken?: string): string | null {
    if (!linkToken) {
      return null;
    }

    try {
      const decoded = this.jwtService.verify<{ id: string }>(linkToken);
      return decoded?.id || null;
    } catch {
      return null;
    }
  }
}
