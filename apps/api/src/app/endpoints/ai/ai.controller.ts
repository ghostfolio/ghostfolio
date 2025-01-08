import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { ImpersonationService } from '@ghostfolio/api/services/impersonation/impersonation.service';
import {
  DEFAULT_CURRENCY,
  DEFAULT_LANGUAGE_CODE,
  HEADER_KEY_IMPERSONATION
} from '@ghostfolio/common/config';
import { AiPromptResponse } from '@ghostfolio/common/interfaces';
import { permissions } from '@ghostfolio/common/permissions';
import type { RequestWithUser } from '@ghostfolio/common/types';

import { Controller, Get, Headers, Inject, UseGuards } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  public constructor(
    private readonly aiService: AiService,
    private readonly impersonationService: ImpersonationService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Get('prompt')
  @HasPermission(permissions.readAiPrompt)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getPrompt(
    @Headers(HEADER_KEY_IMPERSONATION.toLowerCase()) impersonationId
  ): Promise<AiPromptResponse> {
    const impersonationUserId =
      await this.impersonationService.validateImpersonationId(impersonationId);

    const prompt = await this.aiService.getPrompt({
      impersonationId: impersonationUserId,
      languageCode:
        this.request.user.Settings.settings.language ?? DEFAULT_LANGUAGE_CODE,
      userCurrency:
        this.request.user.Settings.settings.baseCurrency ?? DEFAULT_CURRENCY,
      userId: this.request.user.id
    });

    return { prompt };
  }
}
