import {
  Controller,
  Get,
  HttpException,
  Param,
  Req,
  Res,
  UseGuards
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  public constructor(private readonly authService: AuthService) {}

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
      res.redirect(`${process.env.ROOT_URL}/auth/${jwt}`);
    } else {
      res.redirect(`${process.env.ROOT_URL}/auth`);
    }
  }
}
