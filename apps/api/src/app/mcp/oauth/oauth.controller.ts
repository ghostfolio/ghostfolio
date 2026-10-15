import {
  Controller,
  Get,
  HttpCode,
  Logger,
  Post,
  Req,
  Res,
  VERSION_NEUTRAL
} from '@nestjs/common';
import { Request, Response } from 'express';

import { renderConsentPage, renderErrorPage } from './oauth-pages';
import { OAuthError } from './oauth-utils';
import { MCP_RESOURCE_PATH } from './oauth.constants';
import { OAuthService } from './oauth.service';

/**
 * OAuth 2.1 authorization server in front of the MCP endpoint, so that clients
 * that can only connect through OAuth (the claude.ai connectors) can obtain a
 * token interactively. Mounted at the origin root (see the prefix exclusions in
 * main.ts): discovery documents have fixed well-known locations.
 *
 *   GET  /.well-known/oauth-protected-resource    RFC 9728
 *   GET  /.well-known/oauth-authorization-server  RFC 8414
 *   POST /oauth/register                          RFC 7591
 *   GET  /oauth/authorize                         consent screen
 *   POST /oauth/authorize                         decision -> redirect with code
 *   POST /oauth/token                             authorization_code, refresh_token
 */
@Controller({ version: VERSION_NEUTRAL })
export class OAuthController {
  private readonly logger = new Logger(OAuthController.name);

  public constructor(private readonly oAuthService: OAuthService) {}

  @Get([
    '.well-known/oauth-authorization-server',
    `.well-known/oauth-authorization-server${MCP_RESOURCE_PATH}`
  ])
  public getAuthorizationServerMetadata() {
    return this.oAuthService.getAuthorizationServerMetadata();
  }

  @Get([
    '.well-known/oauth-protected-resource',
    `.well-known/oauth-protected-resource${MCP_RESOURCE_PATH}`
  ])
  public getProtectedResourceMetadata() {
    return this.oAuthService.getProtectedResourceMetadata();
  }

  @Post('oauth/register')
  @HttpCode(201)
  public registerClient(@Req() request: Request, @Res() response: Response) {
    return this.respondJson(response, () =>
      this.oAuthService.registerClient(request.body ?? {})
    );
  }

  @Get('oauth/authorize')
  public showConsentPage(@Req() request: Request, @Res() response: Response) {
    try {
      const authorizeRequest = this.oAuthService.parseAuthorizeRequest(
        request.query
      );

      return this.sendHtml(
        response,
        200,
        renderConsentPage({
          clientName: authorizeRequest.clientName,
          fields: this.oAuthService.toFormFields(authorizeRequest)
        })
      );
    } catch (error) {
      return this.sendAuthorizeError(response, error);
    }
  }

  @Post('oauth/authorize')
  public async handleConsentDecision(
    @Req() request: Request,
    @Res() response: Response
  ) {
    try {
      const body = request.body ?? {};
      const authorizeRequest = this.oAuthService.parseAuthorizeRequest(body);

      if (body.decision !== 'allow') {
        return this.redirectToClient(response, authorizeRequest, {
          error: 'access_denied',
          error_description: 'the user denied the request'
        });
      }

      const code = await this.oAuthService.authorize({
        clientIp: request.ip ?? '',
        credential: typeof body.credential === 'string' ? body.credential : '',
        request: authorizeRequest
      });

      if (!code) {
        return this.sendHtml(
          response,
          401,
          renderConsentPage({
            clientName: authorizeRequest.clientName,
            errorMessage: 'The Security Token is not valid.',
            fields: this.oAuthService.toFormFields(authorizeRequest)
          })
        );
      }

      return this.redirectToClient(response, authorizeRequest, { code });
    } catch (error) {
      return this.sendAuthorizeError(response, error);
    }
  }

  @Post('oauth/token')
  @HttpCode(200)
  public exchangeToken(@Req() request: Request, @Res() response: Response) {
    return this.respondJson(response, () =>
      this.oAuthService.exchangeToken(request.body ?? {})
    );
  }

  private redirectToClient(
    response: Response,
    authorizeRequest: { redirectUri: string; state: string },
    parameters: Record<string, string>
  ) {
    const url = new URL(authorizeRequest.redirectUri);

    for (const [name, value] of Object.entries(parameters)) {
      url.searchParams.set(name, value);
    }

    if (authorizeRequest.state) {
      url.searchParams.set('state', authorizeRequest.state);
    }

    response.setHeader('Cache-Control', 'no-store');

    return response.redirect(302, url.toString());
  }

  private async respondJson(response: Response, produce: () => unknown) {
    response.setHeader('Cache-Control', 'no-store');

    try {
      return response.json(await produce());
    } catch (error) {
      if (error instanceof OAuthError) {
        return response.status(error.statusCode).json({
          error: error.code,
          error_description: error.description
        });
      }

      this.logger.error(error);

      return response.status(500).json({
        error: 'server_error',
        error_description: 'unexpected error'
      });
    }
  }

  private sendAuthorizeError(response: Response, error: unknown) {
    if (error instanceof OAuthError) {
      return this.sendHtml(
        response,
        error.statusCode,
        renderErrorPage(error.description)
      );
    }

    this.logger.error(error);

    return this.sendHtml(
      response,
      500,
      renderErrorPage('Something went wrong, please try again.')
    );
  }

  private sendHtml(response: Response, statusCode: number, html: string) {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
    response.setHeader('X-Frame-Options', 'DENY');

    return response.status(statusCode).type('html').send(html);
  }
}
