import { UserService } from '@ghostfolio/api/app/user/user.service';
import { isBrowserUserAgent } from '@ghostfolio/api/helper/user-agent.helper';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import {
  DEFAULT_CURRENCY,
  DEFAULT_LANGUAGE_CODE,
  HEADER_KEY_TIMEZONE
} from '@ghostfolio/common/config';
import { hasRole } from '@ghostfolio/common/permissions';

import { HttpException, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { RequestClient } from '@prisma/client';
import * as countriesAndTimezones from 'countries-and-timezones';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly userService: UserService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      passReqToCallback: true,
      secretOrKey: configurationService.get('JWT_SECRET_KEY')
    });
  }

  public async validate(request: Request, { id }: { id: string }) {
    try {
      const timezone = request.headers[HEADER_KEY_TIMEZONE.toLowerCase()];
      const user = await this.userService.user({ id });

      if (user) {
        if (this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION')) {
          if (hasRole(user, 'INACTIVE')) {
            throw new HttpException(
              getReasonPhrase(StatusCodes.TOO_MANY_REQUESTS),
              StatusCodes.TOO_MANY_REQUESTS
            );
          }

          if (await this.userService.isDailyRequestLimitExceeded({ user })) {
            throw new HttpException(
              getReasonPhrase(StatusCodes.TOO_MANY_REQUESTS),
              StatusCodes.TOO_MANY_REQUESTS
            );
          }

          const country =
            countriesAndTimezones.getCountryForTimezone(timezone)?.id;

          await this.userService.updateAnalytics({
            country,
            requestClient: isBrowserUserAgent(request.headers['user-agent'])
              ? RequestClient.WEB
              : RequestClient.API,
            userId: user.id
          });
        }

        if (!user.settings.settings.baseCurrency) {
          user.settings.settings.baseCurrency = DEFAULT_CURRENCY;
        }

        if (!user.settings.settings.language) {
          user.settings.settings.language = DEFAULT_LANGUAGE_CODE;
        }

        return user;
      } else {
        throw new HttpException(
          getReasonPhrase(StatusCodes.NOT_FOUND),
          StatusCodes.NOT_FOUND
        );
      }
    } catch (error) {
      if (error?.getStatus?.() === StatusCodes.TOO_MANY_REQUESTS) {
        throw error;
      } else {
        throw new HttpException(
          getReasonPhrase(StatusCodes.UNAUTHORIZED),
          StatusCodes.UNAUTHORIZED
        );
      }
    }
  }
}
