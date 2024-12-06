import { UserService } from '@ghostfolio/api/app/user/user.service';
import { ApiKeyService } from '@ghostfolio/api/services/api-key/api-key.service';
import { HEADER_KEY_TOKEN } from '@ghostfolio/common/config';

import { HttpException, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';
import { HeaderAPIKeyStrategy } from 'passport-headerapikey';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(
  HeaderAPIKeyStrategy,
  'api-key'
) {
  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly userService: UserService
  ) {
    super(
      { header: HEADER_KEY_TOKEN, prefix: 'Api-Key ' },
      true,
      async (apiKey: string, done: (error: any, user?: any) => void) => {
        try {
          const user = await this.validateApiKey(apiKey);

          // TODO: Add checks from JwtStrategy

          done(null, user);
        } catch (error) {
          done(error, null);
        }
      }
    );
  }

  private async validateApiKey(apiKey: string) {
    if (!apiKey) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.UNAUTHORIZED),
        StatusCodes.UNAUTHORIZED
      );
    }

    try {
      const { id } = await this.apiKeyService.getUserByApiKey(apiKey);

      return this.userService.user({ id });
    } catch {
      throw new HttpException(
        getReasonPhrase(StatusCodes.UNAUTHORIZED),
        StatusCodes.UNAUTHORIZED
      );
    }
  }
}
