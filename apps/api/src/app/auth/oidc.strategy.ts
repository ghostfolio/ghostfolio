import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Provider } from '@prisma/client';
import { Request } from 'express';
import { Strategy } from 'passport-openidconnect';

import { AuthService } from './auth.service';
import { OidcStateStore } from './oidc-state.store';

interface OidcStrategyOptions {
  authorizationURL: string;
  callbackURL: string;
  clientID: string;
  clientSecret: string;
  issuer: string;
  scope?: string[];
  tokenURL: string;
  userInfoURL: string;
}

interface OidcProfile {
  id?: string;
  sub?: string;
}

interface OidcContext {
  claims?: {
    sub?: string;
  };
}

interface OidcIdToken {
  sub?: string;
}

interface OidcParams {
  sub?: string;
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
      store: OidcStrategy.stateStore
    });
  }

  public async validate(
    _request: Request,
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
