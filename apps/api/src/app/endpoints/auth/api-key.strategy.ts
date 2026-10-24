import { UserService } from '@ghostfolio/api/app/user/user.service';
import { ApiKeyService } from '@ghostfolio/api/services/api-key/api-key.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { HEADER_KEY_TOKEN } from '@ghostfolio/common/config';
import { hasRole } from '@ghostfolio/common/permissions';

import { HttpException, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { RequestClient } from '@prisma/client';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';
import { HeaderAPIKeyStrategy } from 'passport-headerapikey';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(
  HeaderAPIKeyStrategy,
  'api-key'
) {
  public constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly configurationService: ConfigurationService,
    private readonly userService: UserService
  ) {
    super({ header: HEADER_KEY_TOKEN, prefix: 'Api-Key ' }, false);
  }

  public async validate(apiKey: string) {
    const user = await this.validateApiKey(apiKey);

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

      await this.userService.updateAnalytics({
        requestClient: RequestClient.SELF_HOSTING,
        userId: user.id
      });
    }

    return user;
  }

  private async validateApiKey(apiKey: string) {
    if (apiKey) {
      try {
        const { id } = await this.apiKeyService.getUserByApiKey(apiKey);
        const user = await this.userService.user({ id });

        if (user) {
          return user;
        }
      } catch {}
    }

    throw new HttpException(
      getReasonPhrase(StatusCodes.UNAUTHORIZED),
      StatusCodes.UNAUTHORIZED
    );
  }
}
