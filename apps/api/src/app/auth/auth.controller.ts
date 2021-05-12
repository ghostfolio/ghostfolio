import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import {
  Body,
  Controller,
  Get,
  HttpException,
  Param, Post,
  Req,
  Res,
  UseGuards
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { AuthService } from './auth.service';
import { WebAuthService } from '@ghostfolio/api/app/auth/web-auth.service';
// TODO fix type compilation error
// import { AttestationCredentialJSON } from '@simplewebauthn/typescript-types';

@Controller('auth')
export class AuthController {
  public constructor(
    private readonly authService: AuthService,
    private readonly webAuthService: WebAuthService,
    private readonly configurationService: ConfigurationService
  ) {}

  @Get('anonymous/:accessToken')
  public async accessTokenLogin(@Param('accessToken') accessToken: string) {
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
  public googleLoginCallback(@Req() req, @Res() res) {
    // Handles the Google OAuth2 callback
    const jwt: string = req.user.jwt;

    if (jwt) {
      res.redirect(`${this.configurationService.get('ROOT_URL')}/auth/${jwt}`);
    } else {
      res.redirect(`${this.configurationService.get('ROOT_URL')}/auth`);
    }
  }

  @Get('webauthn/generate-attestation-options')
  @UseGuards(AuthGuard('jwt'))
  public async generateAttestationOptions() {
    return this.webAuthService.generateAttestationOptions();
  }

  @Post('webauthn/verify-attestation')
  @UseGuards(AuthGuard('jwt'))
  public async verifyAttestation(@Body() body: any) {
    return this.webAuthService.verifyAttestation(body);
  }

  @Get('webauthn/generate-assertion-options')
  @UseGuards(AuthGuard('jwt'))
  public async generateAssertionOptions() {
    return this.webAuthService.generateAssertionOptions();
  }

  @Post('webauthn/verify-assertion')
  @UseGuards(AuthGuard('jwt'))
  public async verifyAssertion(@Body() body: any) {
    return this.webAuthService.verifyAssertion(body);
  }
}
