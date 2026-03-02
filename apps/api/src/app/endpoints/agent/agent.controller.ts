import { HEADER_KEY_TOKEN } from '@ghostfolio/common/config';
import type { RequestWithUser } from '@ghostfolio/common/types';

import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Res,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';

import { AgentService } from './agent.service';

@Controller('agent')
export class AgentController {
  public constructor(
    private readonly agentService: AgentService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  private getBearerToken(): string {
    const headers = this.request.headers as unknown as Record<string, unknown>;
    const auth =
      headers[HEADER_KEY_TOKEN.toLowerCase()] ?? headers['authorization'];
    if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
      return auth;
    }
    return typeof auth === 'string' ? `Bearer ${auth}` : '';
  }

  @Get('auth/status')
  @UseGuards(AuthGuard('jwt'))
  public async getAuthStatus(@Res() res: Response): Promise<void> {
    if (!this.agentService.isEnabled()) {
      res.status(503).json({ error: 'Agent service is not configured.' });
      return;
    }
    const { status, data } = await this.agentService.proxyToAgent({
      method: 'GET',
      path: '/api/auth/status',
      ghostfolioUserId: this.request.user.id,
      bearerToken: this.getBearerToken()
    });
    res.status(status).json(data);
  }

  @Post('chat')
  @UseGuards(AuthGuard('jwt'))
  public async chat(
    @Body() body: unknown,
    @Res() res: Response
  ): Promise<void> {
    if (!this.agentService.isEnabled()) {
      res.status(503).json({ error: 'Agent service is not configured.' });
      return;
    }
    const { status, data } = await this.agentService.proxyToAgent({
      method: 'POST',
      path: '/api/chat',
      ghostfolioUserId: this.request.user.id,
      bearerToken: this.getBearerToken(),
      body
    });
    res.status(status).json(data);
  }

  @Post('chat/stream')
  @UseGuards(AuthGuard('jwt'))
  public async chatStream(
    @Body() body: unknown,
    @Res() res: Response
  ): Promise<void> {
    if (!this.agentService.isEnabled()) {
      res.status(503).json({ error: 'Agent service is not configured.' });
      return;
    }
    await this.agentService.proxyStreamToAgent({
      path: '/api/chat/stream',
      ghostfolioUserId: this.request.user.id,
      bearerToken: this.getBearerToken(),
      body,
      res
    });
  }
}
