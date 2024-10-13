import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';

import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Provider } from '@prisma/client';
import { Profile, Strategy } from 'passport-google-oauth20';

import { AuthService } from './auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  public constructor(
    private readonly authService: AuthService,
    configurationService: ConfigurationService
  ) {
    super({
      callbackURL: `${configurationService.get(
        'ROOT_URL'
      )}/api/auth/google/callback`,
      clientID: configurationService.get('GOOGLE_CLIENT_ID'),
      clientSecret: configurationService.get('GOOGLE_SECRET'),
      passReqToCallback: true,
      scope: ['profile']
    });
  }

  public async validate(
    _request: any,
    _token: string,
    _refreshToken: string,
    profile: Profile,
    done: Function
  ) {
    try {
      const jwt = await this.authService.validateOAuthLogin({
        provider: Provider.GOOGLE,
        thirdPartyId: profile.id
      });

      done(null, { jwt });
    } catch (error) {
      Logger.error(error, 'GoogleStrategy');
      done(error, false);
    }
  }
}
