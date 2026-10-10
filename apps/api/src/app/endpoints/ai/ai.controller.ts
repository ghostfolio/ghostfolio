import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { Impersonation } from '@ghostfolio/api/decorators/impersonation.decorator';
import { RequiresScope } from '@ghostfolio/api/decorators/requires-scope.decorator';
import { FilterDto } from '@ghostfolio/api/dtos/filter.dto';
import { TransformDataSourceInRequestInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-request/transform-data-source-in-request.interceptor';
import { ApiService } from '@ghostfolio/api/services/api/api.service';
import { AiPromptResponse } from '@ghostfolio/common/interfaces';
import { permissions } from '@ghostfolio/common/permissions';
import { scopes } from '@ghostfolio/common/scopes';
import type {
  AiPromptMode,
  ImpersonationContext,
  RequestWithUser
} from '@ghostfolio/common/types';

import {
  Controller,
  Get,
  Inject,
  Param,
  Query,
  UseInterceptors
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';

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
  @RequiresScope(scopes.portfolioRead)
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  public async getPrompt(
    @Impersonation() { userId, userSettings }: ImpersonationContext,
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
      userId,
      languageCode: this.request.user.settings.settings.language,
      userCurrency: userSettings.baseCurrency
    });

    return { prompt };
  }
}
