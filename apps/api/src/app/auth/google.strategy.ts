import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Provider } from '@prisma/client';
import { Strategy } from 'passport-google-oauth20';

import { AuthService } from './auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  public constructor(private readonly authService: AuthService) {
    super({
      callbackURL: `${process.env.ROOT_URL}/api/auth/google/callback`,
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_SECRET,
      passReqToCallback: true,
      scope: ['email', 'profile']
    });
  }

  public async validate(
    request: any,
    token: string,
    refreshToken: string,
    profile,
    done: Function,
    done2: Function
  ) {
    try {
      const jwt: string = await this.authService.validateOAuthLogin({
        provider: Provider.GOOGLE,
        thirdPartyId: profile.id
      });
      const user = {
        jwt
      };

      done(null, user);
    } catch (err) {
      console.error(err);
      done(err, false);
    }
  }
}
