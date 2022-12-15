import { UserService } from '@ghostfolio/api/app/user/user.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Provider } from '@prisma/client';

import { ValidateOAuthLoginParams } from './interfaces/interfaces';
import { PROPERTY_DISABLE_USER_SIGNUP } from '@ghostfolio/common/config';

@Injectable()
export class AuthService {
  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly propertyService: PropertyService,
    private readonly jwtService: JwtService,
    private readonly userService: UserService
  ) {}

  public async validateAnonymousLogin(accessToken: string): Promise<string> {
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
          const jwt = this.jwtService.sign({
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

  public async validateInternetIdentityLogin(principalId: string) {
    try {
      const provider: Provider = 'INTERNET_IDENTITY';

      let [user] = await this.userService.users({
        where: { provider, thirdPartyId: principalId }
      });

      if (!user) {
        // Guard new user registration based on config property
        if (this.configurationService.get('ENABLE_FEATURE_USER_SIGNUP_CONTROL')) {
          const isUserSignupDisabled = (await this.propertyService.getByKey(
              PROPERTY_DISABLE_USER_SIGNUP
          )) as boolean;

          if(isUserSignupDisabled){
            throw new InternalServerErrorException(
              'validateInternetIdentityLogin',
              'Not Allowed'
            );
          }
        }
        // Create new user if not found
        user = await this.userService.createUser({
          provider,
          thirdPartyId: principalId
        });
      }

      return this.jwtService.sign({
        id: user.id
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'validateInternetIdentityLogin',
        error.message
      );
    }
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
        // Guard new user registration based on config property
        if (this.configurationService.get('ENABLE_FEATURE_USER_SIGNUP_CONTROL')) {
          const isUserSignupDisabled = (await this.propertyService.getByKey(
              PROPERTY_DISABLE_USER_SIGNUP
          )) as boolean;

          if(isUserSignupDisabled){
            throw new InternalServerErrorException(
              'validateInternetIdentityLogin',
              'Not Allowed'
            );
          }
        }
        // Create new user if not found
        user = await this.userService.createUser({
          provider,
          thirdPartyId
        });
      }

      return this.jwtService.sign({
        id: user.id
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'validateOAuthLogin',
        error.message
      );
    }
  }
}
