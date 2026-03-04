import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { DEFAULT_CURRENCY } from '@ghostfolio/common/config';
import { permissions } from '@ghostfolio/common/permissions';
import type { RequestWithUser } from '@ghostfolio/common/types';

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
  Param,
  Post,
  Query,
  Res,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';

import { AgentChatRequestDto } from './agent-chat-request.dto';
import { AgentConversationService } from './agent-conversation.service';
import { AgentFeedbackDto } from './agent-feedback.dto';
import type { AgentStreamEvent } from './agent-stream-event.interface';
import { AgentService } from './agent.service';
import { AgentConnectionTracker } from './guards/agent-connection-tracker';
import { AgentRateLimitGuard } from './guards/agent-rate-limit.guard';
import { AgentMetricsService } from './telemetry/agent-metrics.service';
import { LangfuseFeedbackService } from './telemetry/langfuse-feedback.service';

@Controller('agent')
export class AgentController {
  private readonly logger = new Logger(AgentController.name);

  public constructor(
    private readonly agentConnectionTracker: AgentConnectionTracker,
    private readonly agentConversationService: AgentConversationService,
    private readonly agentService: AgentService,
    private readonly agentMetricsService: AgentMetricsService,
    private readonly configurationService: ConfigurationService,
    private readonly langfuseFeedbackService: LangfuseFeedbackService,
    private readonly prismaService: PrismaService,
    private readonly redisCacheService: RedisCacheService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Post('chat')
  @HasPermission(permissions.accessAssistant)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard, AgentRateLimitGuard)
  public async chat(
    @Body() dto: AgentChatRequestDto,
    @Res() response: Response
  ) {
    if (!this.configurationService.get('ENABLE_FEATURE_AGENT')) {
      response.status(HttpStatus.NOT_IMPLEMENTED).json({
        message: 'Agent is not configured. Set ANTHROPIC_API_KEY to enable.',
        statusCode: HttpStatus.NOT_IMPLEMENTED
      });

      return;
    }

    const apiKey = this.configurationService.get('ANTHROPIC_API_KEY');

    if (!apiKey) {
      response.status(HttpStatus.NOT_IMPLEMENTED).json({
        message: 'Agent is not configured. Set ANTHROPIC_API_KEY to enable.',
        statusCode: HttpStatus.NOT_IMPLEMENTED
      });

      return;
    }

    const userId = this.request.user.id;
    const userCurrency =
      this.request.user.settings.settings.baseCurrency ?? DEFAULT_CURRENCY;
    const languageCode = this.request.user.settings.settings.language;

    // Validate message before opening SSE stream so HttpException returns proper HTTP 400
    const sanitizedMessage = dto.message
      ?.replace(/[\p{Cc}\p{Cf}]/gu, (match) =>
        ['\n', '\r', '\t', ' '].includes(match) ? match : ''
      )
      ?.trim();

    if (!sanitizedMessage) {
      response.status(HttpStatus.BAD_REQUEST).json({
        message: 'Query must not be empty',
        statusCode: HttpStatus.BAD_REQUEST
      });
      return;
    }

    // Run session ownership check and connection acquire in parallel
    const [sessionOwner, connectionAcquired] = await Promise.all([
      dto.sessionId
        ? this.redisCacheService
            .get(`agent:session:${dto.sessionId}`)
            .catch(() => null)
        : Promise.resolve(null),
      this.agentConnectionTracker.acquire(userId)
    ]);

    // Verify session ownership before flushing SSE headers (proper HTTP 403)
    if (dto.sessionId && sessionOwner && sessionOwner !== userId) {
      response.status(HttpStatus.FORBIDDEN).json({
        message: 'Session does not belong to this user',
        statusCode: HttpStatus.FORBIDDEN
      });
      if (connectionAcquired) {
        this.agentConnectionTracker.release(userId);
      }
      return;
    }

    // Check connection limit before flushing headers (proper HTTP 429)
    if (!connectionAcquired) {
      response.status(HttpStatus.TOO_MANY_REQUESTS).json({
        message:
          'Too many concurrent connections. Please close an existing chat before starting a new one.',
        statusCode: HttpStatus.TOO_MANY_REQUESTS
      });
      return;
    }

    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders();

    let aborted = false;
    let eventId = 1;
    const clientAbortController = new AbortController();

    // 60s total request timeout
    response.setTimeout(60_000, () => {
      if (!aborted) {
        this.logger.warn(
          `Agent request timed out after 60s for user ${userId}`
        );
        this.writeSseEvent(response, eventId++, {
          type: 'error',
          code: 'TIMEOUT',
          message: 'Agent request timed out. Please try a simpler query.'
        });
        aborted = true;
        clientAbortController.abort();
        this.agentConnectionTracker.release(userId);
        response.end();
      }
    });

    response.on('close', () => {
      aborted = true;
      clientAbortController.abort();
      this.agentConnectionTracker.release(userId);
    });

    try {
      const generator = this.agentService.chat({
        userId,
        userCurrency,
        languageCode,
        message: sanitizedMessage,
        sessionId: dto.sessionId,
        conversationId: dto.conversationId,
        user: this.request.user,
        abortSignal: clientAbortController.signal
      });

      for await (const event of generator) {
        if (aborted) {
          break;
        }

        this.writeSseEvent(response, eventId++, event);
      }
    } catch (error) {
      this.logger.error(`Agent chat error for user ${userId}`, error);

      if (!aborted) {
        const isNotConfigured =
          error instanceof HttpException &&
          error.getStatus() === HttpStatus.NOT_IMPLEMENTED;
        const errorEvent: AgentStreamEvent = {
          type: 'error',
          code: isNotConfigured ? 'AGENT_NOT_CONFIGURED' : 'INTERNAL_ERROR',
          message: isNotConfigured
            ? error.message
            : 'An unexpected error occurred'
        };

        this.writeSseEvent(response, eventId++, errorEvent);
      }
    } finally {
      if (!aborted) {
        this.agentConnectionTracker.release(userId);
        response.end();
      }
    }
  }

  @Get('conversations')
  @HasPermission(permissions.accessAssistant)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async listConversations(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string
  ) {
    const userId = this.request.user.id;
    const parsedLimit = limit ? Math.min(parseInt(limit, 10) || 20, 50) : 20;

    return this.agentConversationService.listConversations(
      userId,
      cursor,
      parsedLimit
    );
  }

  @Get('conversations/:id')
  @HasPermission(permissions.accessAssistant)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getConversation(@Param('id') id: string) {
    const userId = this.request.user.id;
    const conversation = await this.agentConversationService.getConversation(
      id,
      userId
    );

    if (!conversation) {
      throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);
    }

    return {
      id: conversation.id,
      title: conversation.title,
      sdkSessionId: conversation.sdkSessionId,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      messages: conversation.messages
    };
  }

  @Delete('conversations/:id')
  @HasPermission(permissions.accessAssistant)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async deleteConversation(@Param('id') id: string) {
    const userId = this.request.user.id;
    const result = await this.agentConversationService.deleteConversation(
      id,
      userId
    );

    if (!result) {
      throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);
    }

    return { success: true };
  }

  @Post('feedback')
  @HasPermission(permissions.accessAssistant)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async feedback(
    @Body() dto: AgentFeedbackDto,
    @Res() response: Response
  ) {
    const userId = this.request.user.id;

    try {
      // Check if interaction exists and belongs to user
      const interaction = await this.prismaService.agentInteraction.findFirst({
        where: { id: dto.interactionId, userId }
      });

      if (!interaction) {
        response.status(HttpStatus.NOT_FOUND).json({
          message: 'Interaction not found',
          statusCode: HttpStatus.NOT_FOUND
        });
        return;
      }

      // Check for existing feedback (retraction window)
      const existingFeedback = await this.prismaService.agentFeedback.findFirst(
        {
          where: { interactionId: dto.interactionId, userId }
        }
      );

      if (existingFeedback) {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        if (existingFeedback.createdAt < fiveMinutesAgo) {
          response.status(HttpStatus.CONFLICT).json({
            message: 'Feedback retraction window has expired (5 minutes)',
            statusCode: HttpStatus.CONFLICT
          });
          return;
        }

        // Update within retraction window
        await this.prismaService.agentFeedback.update({
          where: { id: existingFeedback.id },
          data: {
            rating: dto.rating,
            comment: dto.comment
          }
        });
      } else {
        // Create new feedback
        await this.prismaService.agentFeedback.create({
          data: {
            interactionId: dto.interactionId,
            userId,
            rating: dto.rating,
            comment: dto.comment
          }
        });
      }

      // Forward to Langfuse using the OTEL trace ID (not the interaction UUID)
      if (interaction.otelTraceId) {
        void this.langfuseFeedbackService.submitFeedback({
          traceId: interaction.otelTraceId,
          rating: dto.rating,
          comment: dto.comment,
          userId
        });
      }

      // Record metric
      this.agentMetricsService.recordFeedback(dto.rating);

      // Recalculate rolling feedback score from last 100 records
      try {
        const recentFeedback = await this.prismaService.agentFeedback.findMany({
          orderBy: { createdAt: 'desc' },
          take: 100,
          select: { rating: true }
        });

        if (recentFeedback.length > 0) {
          const positiveCount = recentFeedback.filter(
            (f) => f.rating === 'positive'
          ).length;
          const score = positiveCount / recentFeedback.length;
          this.agentMetricsService.updateFeedbackScore(score);
        }
      } catch {
        // Non-critical
      }

      response.status(HttpStatus.OK).json({ success: true });
    } catch (error) {
      this.logger.error('Feedback submission error', error);
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Failed to submit feedback',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      });
    }
  }

  private writeSseEvent(
    response: Response,
    id: number,
    event: AgentStreamEvent
  ) {
    if (!response.writable) {
      return;
    }

    try {
      response.write(
        `id: ${id}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
      );
    } catch {
      // Socket broken — ignore
    }
  }
}
