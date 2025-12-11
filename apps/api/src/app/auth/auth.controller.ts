import { WebAuthService } from '@ghostfolio/api/app/auth/web-auth.service';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { DEFAULT_LANGUAGE_CODE } from '@ghostfolio/common/config';
import {
  AssertionCredentialJSON,
  AttestationCredentialJSON,
  OAuthResponse
} from '@ghostfolio/common/interfaces';

import {
  Body,
  Controller,
  Get,
  HttpException,
  Logger,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  Version,
  VERSION_NEUTRAL
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { getReasonPhrase, StatusCodes } from 'http-status-codes';

import { AuthService } from './auth.service';
import { OidcValidationResult } from './oidc.strategy';

@Controller('auth')
export class AuthController {
  public constructor(
    private readonly authService: AuthService,
    private readonly configurationService: ConfigurationService,
    private readonly webAuthService: WebAuthService
  ) {}

  /**
   * @deprecated
   */
  @Get('anonymous/:accessToken')
  public async accessTokenLoginGet(
    @Param('accessToken') accessToken: string
  ): Promise<OAuthResponse> {
    try {
      const authToken =
        await this.authService.validateAnonymousLogin(accessToken);
      return { authToken };
    } catch {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }
  }

  @Post('anonymous')
  public async accessTokenLogin(
    @Body() body: { accessToken: string }
  ): Promise<OAuthResponse> {
    try {
      const authToken = await this.authService.validateAnonymousLogin(
        body.accessToken
      );
      return { authToken };
    } catch {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  public googleLogin() {
    // Initiates the Google OAuth2 login flow
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @Version(VERSION_NEUTRAL)
  public googleLoginCallback(
    @Req() request: Request,
    @Res() response: Response
  ) {
    const jwt: string = (request.user as any).jwt;

    if (jwt) {
      response.redirect(
        `${this.configurationService.get(
          'ROOT_URL'
        )}/${DEFAULT_LANGUAGE_CODE}/auth/${jwt}`
      );
    } else {
      response.redirect(
        `${this.configurationService.get(
          'ROOT_URL'
        )}/${DEFAULT_LANGUAGE_CODE}/auth`
      );
    }
  }

  @Get('oidc')
  @UseGuards(AuthGuard('oidc'))
  @Version(VERSION_NEUTRAL)
  public oidcLogin(@Query('linkMode') linkMode: string) {
    if (!this.configurationService.get('ENABLE_FEATURE_AUTH_OIDC')) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    // Link mode is handled automatically by OidcStateStore.store()
    // which extracts the token from query params and validates it
    if (linkMode === 'true') {
      Logger.log(
        'OIDC link mode requested - token validation handled by OidcStateStore',
        'AuthController'
      );
    } else {
      Logger.debug('OIDC normal login flow initiated', 'AuthController');
    }

    // The AuthGuard('oidc') handles the redirect to the OIDC provider
  }

  @Get('oidc/callback')
  @UseGuards(AuthGuard('oidc'))
  @Version(VERSION_NEUTRAL)
  public async oidcLoginCallback(
    @Req() request: Request,
    @Res() response: Response
  ) {
    const result = request.user as OidcValidationResult;
    const rootUrl = this.configurationService.get('ROOT_URL');

    // Check if this is a link mode callback
    if (result.linkState?.linkMode) {
      Logger.log(
        `OIDC callback: Link mode detected for user ${result.linkState.userId.substring(0, 8)}...`,
        'AuthController'
      );

      try {
        // Link the OIDC account to the existing user
        await this.authService.linkOidcToUser(
          result.linkState.userId,
          result.thirdPartyId
        );

        Logger.log(
          `OIDC callback: Successfully linked OIDC to user ${result.linkState.userId.substring(0, 8)}...`,
          'AuthController'
        );

        // Redirect to account page with success message
        response.redirect(
          `${rootUrl}/${DEFAULT_LANGUAGE_CODE}/account?linkSuccess=true`
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        Logger.error(
          `OIDC callback: Link failed - ${errorMessage}`,
          'AuthController'
        );

        // Determine error type for frontend
        let errorCode = 'unknown';
        if (errorMessage.includes('already linked')) {
          errorCode = 'already-linked';
        } else if (errorMessage.includes('not found')) {
          errorCode = 'invalid-session';
        } else if (errorMessage.includes('token authentication')) {
          errorCode = 'invalid-provider';
        }

        response.redirect(
          `${rootUrl}/${DEFAULT_LANGUAGE_CODE}/account?linkError=${errorCode}`
        );
      }
      return;
    }

    // Normal OIDC login flow
    Logger.debug('OIDC callback: Normal login flow', 'AuthController');
    const jwt: string = result.jwt;

    if (jwt) {
      response.redirect(`${rootUrl}/${DEFAULT_LANGUAGE_CODE}/auth/${jwt}`);
    } else {
      response.redirect(`${rootUrl}/${DEFAULT_LANGUAGE_CODE}/auth`);
    }
  }

  @Post('webauthn/generate-authentication-options')
  public async generateAuthenticationOptions(
    @Body() body: { deviceId: string }
  ) {
    return this.webAuthService.generateAuthenticationOptions(body.deviceId);
  }

  @Get('webauthn/generate-registration-options')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async generateRegistrationOptions() {
    return this.webAuthService.generateRegistrationOptions();
  }

  @Post('webauthn/verify-attestation')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async verifyAttestation(
    @Body() body: { deviceName: string; credential: AttestationCredentialJSON }
  ) {
    return this.webAuthService.verifyAttestation(body.credential);
  }

  @Post('webauthn/verify-authentication')
  public async verifyAuthentication(
    @Body() body: { deviceId: string; credential: AssertionCredentialJSON }
  ) {
    try {
      const authToken = await this.webAuthService.verifyAuthentication(
        body.deviceId,
        body.credential
      );
      return { authToken };
    } catch {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }
  }
}
