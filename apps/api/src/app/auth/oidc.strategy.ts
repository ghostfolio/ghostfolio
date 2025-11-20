import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Provider } from '@prisma/client';
import { Strategy } from 'passport-openidconnect';

import { AuthService } from './auth.service';
import { OidcStateStore } from './oidc-state.store';

@Injectable()
export class OidcStrategy extends PassportStrategy(Strategy, 'oidc') {
  private static readonly stateStore = new OidcStateStore();

  public constructor(
    private readonly authService: AuthService,
    options: any
  ) {
    super({
      ...options,
      passReqToCallback: true,
      scope: ['openid', 'profile', 'email'],
      store: OidcStrategy.stateStore
    });
  }

  public async validate(
    _request: any,
    _issuer: string,
    profile: any,
    context: any,
    idToken: any,
    _accessToken: any,
    _refreshToken: any,
    params: any
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
