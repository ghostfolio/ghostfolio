import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { UserService } from '../user/user.service';
import { ValidateOAuthLoginParams } from './interfaces/interfaces';

@Injectable()
export class AuthService {
  public constructor(
    private jwtService: JwtService,
    private readonly userService: UserService
  ) {}

  public async validateAnonymousLogin(accessToken: string) {
    return new Promise(async (resolve, reject) => {
      try {
        const hashedAccessToken = this.userService.createAccessToken(
          accessToken,
          process.env.ACCESS_TOKEN_SALT
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
