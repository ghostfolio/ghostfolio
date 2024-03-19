import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { ApiService } from '@ghostfolio/api/services/api/api.service';
import { Export } from '@ghostfolio/common/interfaces';
import type { RequestWithUser } from '@ghostfolio/common/types';

import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { ExportService } from './export.service';

@Controller('export')
export class ExportController {
  public constructor(
    private readonly apiService: ApiService,
    private readonly exportService: ExportService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Get()
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async export(
    @Query('accounts') filterByAccounts?: string,
    @Query('activityIds') activityIds?: string[],
    @Query('assetClasses') filterByAssetClasses?: string,
    @Query('tags') filterByTags?: string
  ): Promise<Export> {
    const filters = this.apiService.buildFiltersFromQueryParams({
      filterByAccounts,
      filterByAssetClasses,
      filterByTags
    });

    return this.exportService.export({
      activityIds,
      filters,
      userCurrency: this.request.user.Settings.settings.baseCurrency,
      userId: this.request.user.id
    });
  }
}
