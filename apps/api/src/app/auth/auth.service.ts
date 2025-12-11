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
      Logger.debug(
        `validateOAuthLogin: Validating login for provider ${provider}, thirdPartyId ${thirdPartyId?.substring(0, 8)}...`,
        'AuthService'
      );

      // First, search by thirdPartyId only to support linked accounts
      // (users with provider ANONYMOUS but with thirdPartyId set)
      let [user] = await this.userService.users({
        where: { thirdPartyId }
      });

      if (user) {
        Logger.log(
          `validateOAuthLogin: Found existing user ${user.id.substring(0, 8)}... with provider ${user.provider} for thirdPartyId`,
          'AuthService'
        );
        return this.jwtService.sign({
          id: user.id
        });
      }

      Logger.debug(
        `validateOAuthLogin: No user found with thirdPartyId, checking if signup is enabled`,
        'AuthService'
      );

      const isUserSignupEnabled =
        await this.propertyService.isUserSignupEnabled();

      if (!isUserSignupEnabled) {
        Logger.warn(
          `validateOAuthLogin: Sign up is disabled, rejecting new user`,
          'AuthService'
        );
        throw new Error('Sign up forbidden');
      }

      // Create new user if not found
      Logger.log(
        `validateOAuthLogin: Creating new user with provider ${provider}`,
        'AuthService'
      );
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
    Logger.log(
      `linkOidcToUser: Starting link process for user ${userId.substring(0, 8)}... with thirdPartyId ${thirdPartyId.substring(0, 8)}...`,
      'AuthService'
    );

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
      Logger.error(
        `linkOidcToUser: User ${userId.substring(0, 8)}... not found`,
        'AuthService'
      );
      throw new Error('User not found');
    }

    if (user.provider !== 'ANONYMOUS') {
      Logger.error(
        `linkOidcToUser: User ${userId.substring(0, 8)}... has provider ${user.provider}, expected ANONYMOUS`,
        'AuthService'
      );
      throw new Error('Only users with token authentication can link OIDC');
    }

    // Update user with thirdPartyId (keeping provider as ANONYMOUS for dual auth)
    await this.userService.updateUser({
      where: { id: userId },
      data: { thirdPartyId }
    });

    Logger.log(
      `linkOidcToUser: Successfully linked OIDC to user ${userId.substring(0, 8)}...`,
      'AuthService'
    );

    return this.jwtService.sign({ id: userId });
  }
}
