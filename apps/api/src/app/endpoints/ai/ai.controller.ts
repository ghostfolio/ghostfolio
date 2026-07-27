import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { ApiService } from '@ghostfolio/api/services/api/api.service';
import {
  DEFAULT_DATE_RANGE,
  HEADER_KEY_IMPERSONATION
} from '@ghostfolio/common/config';
import { AiPromptResponse } from '@ghostfolio/common/interfaces';
import { permissions } from '@ghostfolio/common/permissions';
import type {
  AiPromptMode,
  DateRange,
  RequestWithUser
} from '@ghostfolio/common/types';

import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Inject,
  Param,
  Post,
  Query,
  Res,
  ServiceUnavailableException,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { pipeUIMessageStreamToResponse } from 'ai';
import type { Response } from 'express';

import { AiChatThrottlerGuard } from './ai-chat-throttler.guard';
import { AiChatDto } from './ai-chat.dto';
import { AiService } from './ai.service';

const DATE_RANGE_PATTERN = /^(1d|1y|5y|max|mtd|wtd|ytd|\d{4})$/;

@Controller('ai')
export class AiController {
  public constructor(
    private readonly aiService: AiService,
    private readonly apiService: ApiService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Post('chat')
  @HasPermission(permissions.accessAiChat)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard, AiChatThrottlerGuard)
  public async chat(
    @Body() { messages }: AiChatDto,
    @Headers(HEADER_KEY_IMPERSONATION.toLowerCase())
    impersonationId: string,
    @Query('accounts') filterByAccounts: string,
    @Query('assetClasses') filterByAssetClasses: string,
    @Query('dataSource') filterByDataSource: string,
    @Query('range') dateRange: DateRange = DEFAULT_DATE_RANGE,
    @Query('symbol') filterBySymbol: string,
    @Query('tags') filterByTags: string,
    @Res() response: Response
  ): Promise<void> {
    if (impersonationId !== undefined) {
      throw new ForbiddenException(
        'AI portfolio chat is unavailable while impersonating another user'
      );
    }

    if (!DATE_RANGE_PATTERN.test(dateRange)) {
      throw new BadRequestException('Invalid date range');
    }

    const filters = this.apiService.buildFiltersFromQueryParams({
      filterByAccounts,
      filterByAssetClasses,
      filterByDataSource,
      filterBySymbol,
      filterByTags
    });
    const abortController = new AbortController();

    response.once('close', () => {
      if (!response.writableEnded) {
        abortController.abort();
      }
    });

    try {
      const stream = await this.aiService.streamChat({
        dateRange,
        filters,
        messages,
        abortSignal: abortController.signal,
        languageCode: this.request.user.settings.settings.language,
        userCurrency: this.request.user.settings.settings.baseCurrency,
        userId: this.request.user.id
      });

      pipeUIMessageStreamToResponse({
        headers: { 'Cache-Control': 'no-store' },
        response,
        stream
      });
    } catch {
      throw new ServiceUnavailableException(
        'AI portfolio chat is temporarily unavailable'
      );
    }
  }

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
}
