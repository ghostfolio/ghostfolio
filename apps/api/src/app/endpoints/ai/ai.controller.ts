import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import {
  DEFAULT_CURRENCY,
  DEFAULT_LANGUAGE_CODE
} from '@ghostfolio/common/config';
import { AiPromptResponse } from '@ghostfolio/common/interfaces';
import { permissions } from '@ghostfolio/common/permissions';
import type { RequestWithUser } from '@ghostfolio/common/types';

import { Controller, Get, Inject, Param, UseGuards } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  public constructor(
    private readonly aiService: AiService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Get('prompt/:mode')
  @HasPermission(permissions.readAiPrompt)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getPrompt(
    @Param('mode') mode: 'analysis' | 'portfolio'
  ): Promise<AiPromptResponse> {
    const prompt = await this.aiService.getPrompt({
      impersonationId: undefined,
      languageCode:
        this.request.user.Settings.settings.language ?? DEFAULT_LANGUAGE_CODE,
      mode,
      userCurrency:
        this.request.user.Settings.settings.baseCurrency ?? DEFAULT_CURRENCY,
      userId: this.request.user.id
    });

    return { prompt };
  }
}
