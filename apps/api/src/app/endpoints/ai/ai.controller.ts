import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { FilterDto } from '@ghostfolio/api/dtos/filter.dto';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { ApiService } from '@ghostfolio/api/services/api/api.service';
import { AiPromptResponse } from '@ghostfolio/common/interfaces';
import { permissions } from '@ghostfolio/common/permissions';
import type { AiPromptMode, RequestWithUser } from '@ghostfolio/common/types';

import {
  Controller,
  Get,
  Inject,
  Param,
  Query,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

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
    @Query()
    { accounts, assetClasses, dataSource, symbol, tags }: FilterDto
  ): Promise<AiPromptResponse> {
    const filters = this.apiService.buildFiltersFromQueryParams({
      filterByAccounts: accounts,
      filterByAssetClasses: assetClasses,
      filterByDataSource: dataSource,
      filterBySymbol: symbol,
      filterByTags: tags
    });

    const prompt = await this.aiService.getPrompt({
      filters,
      mode,
      languageCode: this.request.user.settings.settings.language,
      userCurrency: this.request.user.settings.settings.baseCurrency,
      userId: this.request.user.id
    });

    return { prompt };
  }
}
