import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { permissions } from '@ghostfolio/common/permissions';
import type { RequestWithUser } from '@ghostfolio/common/types';

import {
  Body,
  Controller,
  Get,
  Header,
  Inject,
  Param,
  Post,
  Query,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { AgentTraceService } from './agent-trace.service';
import type { AgentChatMessage } from './agent.service';
import { AgentService } from './agent.service';
import { CHAT_PAGE_HTML } from './chat-page';
import { TRACES_PAGE_HTML } from './traces-page';

@Controller('agent')
export class AgentController {
  public constructor(
    private readonly agentService: AgentService,
    private readonly traceService: AgentTraceService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Get('chat')
  @Header('Content-Type', 'text/html')
  public getChatPage(): string {
    return CHAT_PAGE_HTML;
  }

  @Get('dashboard')
  @Header('Content-Type', 'text/html')
  public getDashboardPage(): string {
    return TRACES_PAGE_HTML;
  }

  @Post('chat')
  @HasPermission(permissions.readAiPrompt)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async chat(
    @Body() body: { messages: AgentChatMessage[] }
  ): Promise<{
    message: { role: 'assistant'; content: string };
    verification?: { passed: boolean; type: string; message?: string };
    error?: string;
  }> {
    const userId = this.request.user.id;
    const messages = Array.isArray(body?.messages) ? body.messages : [];

    if (messages.length === 0) {
      return {
        message: {
          role: 'assistant',
          content: 'Please send at least one message.'
        },
        error: 'Missing messages'
      };
    }

    const result = await this.agentService.chat({
      userId,
      messages
    });

    return {
      message: result.message,
      ...(result.verification && { verification: result.verification }),
      ...(result.error && { error: result.error })
    };
  }

  @Get('traces')
  @HasPermission(permissions.accessAdminControl)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public getTraces(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    return {
      traces: this.traceService.getTraces(
        Number(limit) || 50,
        Number(offset) || 0
      ),
      stats: this.traceService.getStats()
    };
  }

  @Get('traces/stats')
  @HasPermission(permissions.accessAdminControl)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public getTraceStats() {
    return this.traceService.getStats();
  }

  @Get('traces/:id')
  @HasPermission(permissions.accessAdminControl)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public getTraceById(@Param('id') id: string) {
    return this.traceService.getTraceById(id) ?? { error: 'Trace not found' };
  }
}
