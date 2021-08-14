import { UserService } from '@ghostfolio/api/app/user/user.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { ValidateOAuthLoginParams } from './interfaces/interfaces';

@Injectable()
export class AuthService {
  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly jwtService: JwtService,
    private readonly userService: UserService
  ) {}

  public async validateAnonymousLogin(accessToken: string) {
    return new Promise(async (resolve, reject) => {
      try {
        const hashedAccessToken = this.userService.createAccessToken(
          accessToken,
          this.configurationService.get('ACCESS_TOKEN_SALT')
        );

        const [user] = await this.userService.users({
          where: { accessToken: hashedAccessToken }
        });

        if (user) {
          const jwt: string = this.jwtService.sign({
            id: user.id
          });

          resolve(jwt);
        } else {
          throw new Error();
        }
      } catch {
        reject();
      }
    });
  }

  public async validateOAuthLogin({
    provider,
    thirdPartyId
  }: ValidateOAuthLoginParams): Promise<string> {
    try {
      let [user] = await this.userService.users({
        where: { provider, thirdPartyId }
      });

      if (!user) {
        // Create new user if not found
        user = await this.userService.createUser({
          provider,
          thirdPartyId
        });
      }

      const jwt: string = this.jwtService.sign({
        id: user.id
      });

      return jwt;
    } catch (err) {
      throw new InternalServerErrorException('validateOAuthLogin', err.message);
    }
  }
}
