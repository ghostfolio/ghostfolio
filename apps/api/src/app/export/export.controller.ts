import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { TransformDataSourceInRequestInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-request/transform-data-source-in-request.interceptor';
import { TransformDataSourceInResponseInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-response/transform-data-source-in-response.interceptor';
import { ApiService } from '@ghostfolio/api/services/api/api.service';
import { splitStringToArray } from '@ghostfolio/common/helper';
import { ExportResponse } from '@ghostfolio/common/interfaces';
import type { RequestWithUser } from '@ghostfolio/common/types';

import {
  Controller,
  Get,
  Inject,
  Query,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Type as ActivityType } from '@prisma/client';

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
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  @UseInterceptors(TransformDataSourceInResponseInterceptor)
  public async export(
    @Query('accounts') filterByAccounts?: string,
    @Query('activityIds') filterByActivityIds?: string,
    @Query('assetClasses') filterByAssetClasses?: string,
    @Query('dataSource') filterByDataSource?: string,
    @Query('symbol') filterBySymbol?: string,
    @Query('tags') filterByTags?: string,
    @Query('activityTypes') filterByTypes?: string
  ): Promise<ExportResponse> {
    const activityIds = filterByActivityIds?.split(',') ?? [];
    const activityTypes = filterByTypes
      ? (splitStringToArray(filterByTypes) as ActivityType[])
      : undefined;
    const filters = this.apiService.buildFiltersFromQueryParams({
      filterByAccounts,
      filterByAssetClasses,
      filterByDataSource,
      filterBySymbol,
      filterByTags
    });

    return this.exportService.export({
      activityIds,
      filters,
      activityTypes: activityTypes,
      userId: this.request.user.id,
      userSettings: this.request.user.settings.settings
    });
  }
}
