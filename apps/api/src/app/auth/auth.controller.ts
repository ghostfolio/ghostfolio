import { WebAuthService } from '@ghostfolio/api/app/auth/web-auth.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { OAuthResponse } from '@ghostfolio/common/interfaces';
import {
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
  VERSION_NEUTRAL,
  Version
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { AuthService } from './auth.service';
import {
  AssertionCredentialJSON,
  AttestationCredentialJSON
} from './interfaces/simplewebauthn';

@Controller('auth')
export class AuthController {
  public constructor(
    private readonly authService: AuthService,
    private readonly configurationService: ConfigurationService,
    private readonly webAuthService: WebAuthService
  ) {}

  @Get('anonymous/:accessToken')
  public async accessTokenLogin(
    @Param('accessToken') accessToken: string
  ): Promise<OAuthResponse> {
    try {
      const authToken = await this.authService.validateAnonymousLogin(
        accessToken
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
  public googleLoginCallback(@Req() req, @Res() res) {
    // Handles the Google OAuth2 callback
    const jwt: string = req.user.jwt;

    if (jwt) {
      res.redirect(`${this.configurationService.get('ROOT_URL')}/auth/${jwt}`);
    } else {
      res.redirect(`${this.configurationService.get('ROOT_URL')}/auth`);
    }
  }

  @Get('internet-identity/:principalId')
  public async internetIdentityLogin(
    @Param('principalId') principalId: string
  ): Promise<OAuthResponse> {
    try {
      const authToken = await this.authService.validateInternetIdentityLogin(
        principalId
      );
      return { authToken };
    } catch {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }
  }

  @Get('webauthn/generate-registration-options')
  @UseGuards(AuthGuard('jwt'))
  public async generateRegistrationOptions() {
    return this.webAuthService.generateRegistrationOptions();
  }

  @Post('webauthn/verify-attestation')
  @UseGuards(AuthGuard('jwt'))
  public async verifyAttestation(
    @Body() body: { deviceName: string; credential: AttestationCredentialJSON }
  ) {
    return this.webAuthService.verifyAttestation(
      body.deviceName,
      body.credential
    );
  }

  @Post('webauthn/generate-assertion-options')
  public async generateAssertionOptions(@Body() body: { deviceId: string }) {
    return this.webAuthService.generateAssertionOptions(body.deviceId);
  }

  @Post('webauthn/verify-assertion')
  public async verifyAssertion(
    @Body() body: { deviceId: string; credential: AssertionCredentialJSON }
  ) {
    try {
      const authToken = await this.webAuthService.verifyAssertion(
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
