import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Provider } from '@prisma/client';
import { Request } from 'express';
import { Strategy } from 'passport-openidconnect';

import { AuthService } from './auth.service';
import { OidcStateStore } from './oidc-state.store';

interface OidcStrategyOptions {
  authorizationURL?: string;
  callbackURL: string;
  clientID: string;
  clientSecret: string;
  issuer?: string;
  scope?: string[];
  tokenURL?: string;
  userInfoURL?: string;
}

@Injectable()
export class OidcStrategy extends PassportStrategy(Strategy, 'oidc') {
  private static readonly stateStore = new OidcStateStore();

  public constructor(
    private readonly authService: AuthService,
    options: OidcStrategyOptions
  ) {
    super({
      ...options,
      passReqToCallback: true,
      scope: ['openid', 'profile', 'email'],
      store: OidcStrategy.stateStore
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  }

  public async validate(
    _request: Request,
    _issuer: string,
    profile: { id?: string },
    context: { claims?: { sub?: string } },
    idToken: { sub?: string },
    _accessToken: string,
    _refreshToken: string,
    params: { sub?: string }
  ) {
    try {
      const thirdPartyId =
        params?.sub || idToken?.sub || context?.claims?.sub || profile?.id;

      if (!thirdPartyId) {
        throw new Error('Missing subject identifier in OIDC response');
      }

      const jwt = await this.authService.validateOAuthLogin({
        provider: Provider.OIDC,
        thirdPartyId
      });

      return { jwt };
    } catch (error) {
      Logger.error(error, 'OidcStrategy');
      throw error;
    }
  }
}
