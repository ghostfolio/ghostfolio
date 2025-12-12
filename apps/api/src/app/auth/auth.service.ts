import { UserService } from '@ghostfolio/api/app/user/user.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';

import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { ValidateOAuthLoginParams } from './interfaces/interfaces';

@Injectable()
export class AuthService {
  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly jwtService: JwtService,
    private readonly propertyService: PropertyService,
    private readonly userService: UserService
  ) {}

  public async validateAnonymousLogin(accessToken: string): Promise<string> {
    const hashedAccessToken = this.userService.createAccessToken({
      password: accessToken,
      salt: this.configurationService.get('ACCESS_TOKEN_SALT')
    });

    const [user] = await this.userService.users({
      where: { accessToken: hashedAccessToken }
    });

    if (user) {
      return this.jwtService.sign({
        id: user.id
      });
    }

    throw new Error();
  }

  public async validateOAuthLogin({
    provider,
    thirdPartyId
  }: ValidateOAuthLoginParams): Promise<string> {
    try {
      // First, search by thirdPartyId only to support linked accounts
      // (users with provider ANONYMOUS but with thirdPartyId set)
      let [user] = await this.userService.users({
        where: { thirdPartyId }
      });

      if (user) {
        return this.jwtService.sign({
          id: user.id
        });
      }

      const isUserSignupEnabled =
        await this.propertyService.isUserSignupEnabled();

      if (!isUserSignupEnabled) {
        throw new Error('Sign up forbidden');
      }

      // Create new user if not found
      user = await this.userService.createUser({
        data: {
          provider,
          thirdPartyId
        }
      });

      return this.jwtService.sign({
        id: user.id
      });
    } catch (error) {
      Logger.error(
        `validateOAuthLogin: Error - ${error instanceof Error ? error.message : 'Unknown error'}`,
        'AuthService'
      );
      throw new InternalServerErrorException(
        'validateOAuthLogin',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Links an OIDC provider to an existing user account.
   * The user must have provider ANONYMOUS (token-based auth).
   * The thirdPartyId must not be already linked to another user.
   *
   * @param userId - The ID of the user to link
   * @param thirdPartyId - The OIDC subject identifier
   * @returns JWT token for the linked user
   * @throws ConflictException if thirdPartyId is already linked to another user
   * @throws Error if user not found or has invalid provider
   */
  public async linkOidcToUser(
    userId: string,
    thirdPartyId: string
  ): Promise<string> {
    // Check if thirdPartyId is already linked to another user
    const [existingUser] = await this.userService.users({
      where: { thirdPartyId }
    });

    if (existingUser) {
      if (existingUser.id === userId) {
        Logger.warn(
          `linkOidcToUser: User ${userId.substring(0, 8)}... is already linked to this thirdPartyId`,
          'AuthService'
        );
        // Already linked to the same user, just return token
        return this.jwtService.sign({ id: userId });
      }

      Logger.warn(
        `linkOidcToUser: thirdPartyId already linked to another user ${existingUser.id.substring(0, 8)}...`,
        'AuthService'
      );
      throw new ConflictException(
        'This OIDC account is already linked to another user'
      );
    }

    // Get the current user
    const user = await this.userService.user({ id: userId });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.provider !== 'ANONYMOUS') {
      throw new Error('Only users with token authentication can link OIDC');
    }

    // Update user with thirdPartyId (keeping provider as ANONYMOUS for dual auth)
    await this.userService.updateUser({
      where: { id: userId },
      data: { thirdPartyId }
    });

    return this.jwtService.sign({ id: userId });
  }
}
