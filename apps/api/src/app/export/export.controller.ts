import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { TransformDataSourceInRequestInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-request/transform-data-source-in-request.interceptor';
import { TransformDataSourceInResponseInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-response/transform-data-source-in-response.interceptor';
import { ApiService } from '@ghostfolio/api/services/api/api.service';
import { getIntervalFromDateRange } from '@ghostfolio/common/calculation-helper';
import { ExportResponse } from '@ghostfolio/common/interfaces';
import type { DateRange, RequestWithUser } from '@ghostfolio/common/types';

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
    @Query('activityTypes') filterByTypes?: string,
    @Query('assetClasses') filterByAssetClasses?: string,
    @Query('dataSource') filterByDataSource?: string,
    @Query('range') dateRange?: DateRange,
    @Query('symbol') filterBySymbol?: string,
    @Query('tags') filterByTags?: string
  ): Promise<ExportResponse> {
    const activityIds = filterByActivityIds?.split(',') ?? [];
    const activityTypes = (filterByTypes?.split(',') as ActivityType[]) ?? [];

    let endDate: Date;
    let startDate: Date;

    if (dateRange) {
      ({ endDate, startDate } = getIntervalFromDateRange({ dateRange }));
    }

    const filters = this.apiService.buildFiltersFromQueryParams({
      filterByAccounts,
      filterByAssetClasses,
      filterByDataSource,
      filterBySymbol,
      filterByTags
    });

    return this.exportService.export({
      activityIds,
      activityTypes,
      endDate,
      filters,
      startDate,
      userId: this.request.user.id,
      userSettings: this.request.user.settings.settings
    });
  }
}
