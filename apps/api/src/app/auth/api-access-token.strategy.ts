import { AccessService } from '@ghostfolio/api/app/access/access.service';
import { UserService } from '@ghostfolio/api/app/user/user.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import {
  DEFAULT_CURRENCY,
  DEFAULT_LANGUAGE_CODE,
  HEADER_KEY_TOKEN
} from '@ghostfolio/common/config';
import { hasRole } from '@ghostfolio/common/permissions';
import { UserWithApiAccess } from '@ghostfolio/common/types';

import { HttpException, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { AccessType } from '@prisma/client';
import { isBefore } from 'date-fns';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';
import { HeaderAPIKeyStrategy } from 'passport-headerapikey';

@Injectable()
export class ApiAccessTokenStrategy extends PassportStrategy(
  HeaderAPIKeyStrategy,
  'api-access-token'
) {
  public constructor(
    private readonly accessService: AccessService,
    private readonly configurationService: ConfigurationService,
    private readonly userService: UserService
  ) {
    super({ header: HEADER_KEY_TOKEN, prefix: 'Api-Key ' }, false);
  }

  public async validate(apiToken: string): Promise<UserWithApiAccess> {
    if (!apiToken) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.UNAUTHORIZED),
        StatusCodes.UNAUTHORIZED
      );
    }

    const access = await this.accessService.getAccessByApiToken(apiToken);

    if (
      !access ||
      access.type !== AccessType.API ||
      (access.expiresAt && isBefore(access.expiresAt, new Date()))
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.UNAUTHORIZED),
        StatusCodes.UNAUTHORIZED
      );
    }

    const user = await this.userService.user({ id: access.userId });

    if (!user) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.UNAUTHORIZED),
        StatusCodes.UNAUTHORIZED
      );
    }

    if (
      this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION') &&
      hasRole(user, 'INACTIVE')
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.TOO_MANY_REQUESTS),
        StatusCodes.TOO_MANY_REQUESTS
      );
    }

    if (!user.settings.settings.baseCurrency) {
      user.settings.settings.baseCurrency = DEFAULT_CURRENCY;
    }

    if (!user.settings.settings.language) {
      user.settings.settings.language = DEFAULT_LANGUAGE_CODE;
    }

    // The api token only grants a read-only view of the portfolio
    user.permissions = [];

    return Object.assign(user, { apiAccess: access });
  }
}
