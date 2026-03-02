import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { ApiService } from '@ghostfolio/api/services/api/api.service';
import { AiPromptResponse } from '@ghostfolio/common/interfaces';
import { permissions } from '@ghostfolio/common/permissions';
import type { AiPromptMode, RequestWithUser } from '@ghostfolio/common/types';

import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Res,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';

import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  public constructor(
    private readonly aiService: AiService,
    private readonly apiService: ApiService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Get('prompt/:mode')
  @HasPermission(permissions.readAiPrompt)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getPrompt(
    @Param('mode') mode: AiPromptMode,
    @Query('accounts') filterByAccounts?: string,
    @Query('assetClasses') filterByAssetClasses?: string,
    @Query('dataSource') filterByDataSource?: string,
    @Query('symbol') filterBySymbol?: string,
    @Query('tags') filterByTags?: string
  ): Promise<AiPromptResponse> {
    const filters = this.apiService.buildFiltersFromQueryParams({
      filterByAccounts,
      filterByAssetClasses,
      filterByDataSource,
      filterBySymbol,
      filterByTags
    });

    const prompt = await this.aiService.getPrompt({
      filters,
      mode,
      impersonationId: undefined,
      languageCode: this.request.user.settings.settings.language,
      userCurrency: this.request.user.settings.settings.baseCurrency,
      userId: this.request.user.id
    });

    return { prompt };
  }

  @Post('agent')
  @HasPermission(permissions.readAiPrompt)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async agentChat(
    @Body() body: { message: string; conversationHistory?: any[] }
  ) {
    return this.aiService.agentChat({
      message: body.message,
      conversationHistory: body.conversationHistory,
      impersonationId: undefined,
      userCurrency: this.request.user.settings.settings.baseCurrency,
      userId: this.request.user.id
    });
  }

  @Post('agent/stream')
  @HasPermission(permissions.readAiPrompt)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async agentChatStream(
    @Body() body: { message: string; conversationHistory?: any[] },
    @Res() res: Response
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    await this.aiService.agentChatStream({
      message: body.message,
      conversationHistory: body.conversationHistory,
      impersonationId: undefined,
      userCurrency: this.request.user.settings.settings.baseCurrency,
      userId: this.request.user.id,
      onChunk: (text) => {
        res.write(`event: text\ndata: ${JSON.stringify(text)}\n\n`);
      },
      onDone: (metadata) => {
        res.write(`event: done\ndata: ${JSON.stringify(metadata)}\n\n`);
        res.end();
      },
      onError: (error) => {
        res.write(`event: error\ndata: ${JSON.stringify({ error })}\n\n`);
        res.end();
      }
    });
  }

  @Post('feedback')
  @HasPermission(permissions.readAiPrompt)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async submitFeedback(
    @Body() body: { traceId: string; value: number }
  ) {
    return this.aiService.submitFeedback({
      traceId: body.traceId,
      value: body.value,
      userId: this.request.user.id
    });
  }
}
