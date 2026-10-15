import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  Controller,
  Delete,
  Get,
  Logger,
  Post,
  Req,
  Res
} from '@nestjs/common';
import { Request, Response } from 'express';

import { McpAuthService } from './mcp-auth.service';
import { McpService } from './mcp.service';
import { OAuthService } from './oauth/oauth.service';

/**
 * Model Context Protocol endpoint (Streamable HTTP, stateless, JSON
 * responses) served at `/api/v1/mcp`.
 *
 * Authentication is done here with the bearer credential of the request, not
 * with a passport guard, because the credential may be an API key or the
 * Security Token instead of a JWT (see McpAuthService).
 */
@Controller('mcp')
export class McpController {
  private readonly logger = new Logger(McpController.name);

  public constructor(
    private readonly mcpAuthService: McpAuthService,
    private readonly mcpService: McpService,
    private readonly oAuthService: OAuthService
  ) {}

  @Delete()
  public deleteNotAllowed(@Res() response: Response) {
    return this.respondMethodNotAllowed(response);
  }

  @Get()
  public getNotAllowed(@Res() response: Response) {
    return this.respondMethodNotAllowed(response);
  }

  @Post()
  public async handleRequest(
    @Req() request: Request,
    @Res() response: Response
  ) {
    const authorizationToken = await this.mcpAuthService.getAuthorizationToken(
      request.headers.authorization
    );

    if (!authorizationToken) {
      // Tells an OAuth-capable client (RFC 9728) where to start the flow
      response.setHeader(
        'WWW-Authenticate',
        `Bearer resource_metadata="${this.oAuthService.resourceMetadataUrl}"`
      );

      return response.status(401).json({
        error: { code: -32001, message: 'Unauthorized' },
        id: null,
        jsonrpc: '2.0'
      });
    }

    const server = this.mcpService.createServer({ authorizationToken });
    const transport = new StreamableHTTPServerTransport({
      enableJsonResponse: true,
      sessionIdGenerator: undefined
    });

    response.on('close', () => {
      transport.close();
      server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(request, response, request.body);
    } catch (error) {
      this.logger.error(error);

      if (!response.headersSent) {
        response.status(500).json({
          error: { code: -32603, message: 'Internal server error' },
          id: null,
          jsonrpc: '2.0'
        });
      }
    }
  }

  private respondMethodNotAllowed(response: Response) {
    // Stateless server: there is no session to stream to or to terminate
    response.setHeader('Allow', 'POST');

    return response.status(405).json({
      error: { code: -32000, message: 'Method not allowed.' },
      id: null,
      jsonrpc: '2.0'
    });
  }
}
