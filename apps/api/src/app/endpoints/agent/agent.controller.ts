import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { permissions } from '@ghostfolio/common/permissions';
import type { RequestWithUser } from '@ghostfolio/common/types';

import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Logger,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { pipeAgentUIStreamToResponse, type UIMessage } from 'ai';
import type { Response } from 'express';

import { AgentFeedbackService } from './agent-feedback.service';
import { AgentMetricsService } from './agent-metrics.service';
import { AgentService } from './agent.service';
import { SubmitFeedbackDto } from './submit-feedback.dto';

@Controller('agent')
export class AgentController {
  private readonly logger = new Logger(AgentController.name);

  public constructor(
    private readonly agentFeedbackService: AgentFeedbackService,
    private readonly agentMetricsService: AgentMetricsService,
    private readonly agentService: AgentService,
    private readonly prismaService: PrismaService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Post('chat')
  @HasPermission(permissions.readAiPrompt)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async chat(
    @Body()
    body: {
      messages: UIMessage[];
      toolHistory?: string[];
      model?: string;
      approvedActions?: string[];
    },
    @Res() res: Response
  ) {
    try {
      const { agent, requestId } = await this.agentService.chat({
        approvedActions: body.approvedActions,
        messages: body.messages,
        toolHistory: body.toolHistory,
        model: body.model,
        userId: this.request.user.id
      });

      await pipeAgentUIStreamToResponse({
        response: res,
        agent,
        uiMessages: body.messages,
        messageMetadata: ({ part }) => {
          if (part.type === 'finish') {
            return { requestId };
          }
          if (part.type === 'finish-step') {
            return { stepFinish: true, finishReason: part.finishReason };
          }
          return undefined;
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        `Chat failed: ${message}`,
        error instanceof Error ? error.stack : undefined
      );

      this.agentMetricsService.record({
        requestId: 'error-' + Date.now(),
        userId: this.request.user.id,
        latencyMs: 0,
        totalSteps: 0,
        toolsUsed: [],
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        errorOccurred: true,
        errorMessage: message,
        timestamp: Date.now()
      });

      if (!res.headersSent) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: 'Agent chat failed'
        });
      }
    }
  }

  @Post('feedback')
  @HasPermission(permissions.readAiPrompt)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async submitFeedback(@Body() body: SubmitFeedbackDto) {
    return this.agentFeedbackService.submit({
      requestId: body.requestId,
      userId: this.request.user.id,
      rating: body.rating,
      comment: body.comment
    });
  }

  @Get('verification/:requestId')
  @HasPermission(permissions.readAiPrompt)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getVerification(@Param('requestId') requestId: string) {
    const log = await this.prismaService.agentChatLog.findFirst({
      where: { requestId, userId: this.request.user.id },
      select: {
        requestId: true,
        verificationScore: true,
        verificationResult: true,
        latencyMs: true,
        totalSteps: true,
        toolsUsed: true,
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        createdAt: true
      }
    });

    if (!log) {
      throw new NotFoundException(`No chat log found for ${requestId}`);
    }

    return log;
  }

  @Get('metrics')
  @HasPermission(permissions.readAiPrompt)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getMetrics(@Query('since') since?: string) {
    const sinceMs = since ? parseDuration(since) : undefined;

    const [summary, feedback] = await Promise.all([
      this.agentMetricsService.getSummary(sinceMs),
      this.agentFeedbackService.getSummary(sinceMs)
    ]);

    return {
      summary,
      feedback,
      recent: this.agentMetricsService.getRecent(10)
    };
  }
}

function parseDuration(input: string): number | undefined {
  const match = /^(\d+)(m|h|d)$/.exec(input);

  if (!match) return undefined;

  const [, value, unit] = match;
  const multipliers: Record<string, number> = {
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000
  };

  return Number(value) * multipliers[unit];
}
