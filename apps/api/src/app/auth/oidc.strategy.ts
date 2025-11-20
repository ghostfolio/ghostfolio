import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Provider } from '@prisma/client';
import { DoneCallback } from 'passport';
import { Strategy } from 'passport-openidconnect';

import { AuthService } from './auth.service';

@Injectable()
export class OidcStrategy extends PassportStrategy(Strategy, 'oidc') {
  public constructor(
    private readonly authService: AuthService,
    options: any
  ) {
    super({
      ...options,
      passReqToCallback: true,
      scope: ['openid', 'profile', 'email']
    });
  }

  public async validate(
    _request: any,
    _issuer: string,
    profile: any,
    done: DoneCallback
  ) {
    try {
      const jwt = await this.authService.validateOAuthLogin({
        provider: Provider.OIDC,
        thirdPartyId: profile.id
      });

      done(null, { jwt });
    } catch (error) {
      Logger.error(error, 'OidcStrategy');
      done(error, false);
    }
  }
}
