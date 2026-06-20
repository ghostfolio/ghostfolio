import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { ApiService } from '@ghostfolio/api/services/api/api.service';
import { UpdateAssetProfileDataDto } from '@ghostfolio/common/dtos';
import {
  AssetProfilesResponse,
  EnhancedSymbolProfile
} from '@ghostfolio/common/interfaces';
import { permissions } from '@ghostfolio/common/permissions';
import { MarketDataPreset, RequestWithUser } from '@ghostfolio/common/types';

import {
  Body,
  Controller,
  Get,
  HttpException,
  Inject,
  Param,
  Patch,
  Query,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { DataSource, Prisma } from '@prisma/client';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { AssetProfilesService } from './asset-profiles.service';

@Controller('asset-profiles')
export class AssetProfilesController {
  public constructor(
    private readonly apiService: ApiService,
    private readonly assetProfilesService: AssetProfilesService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Get()
  @HasPermission(permissions.accessAdminControl)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getAssetProfiles(
    @Query('assetSubClasses') filterByAssetSubClasses?: string,
    @Query('dataSource') filterByDataSource?: string,
    @Query('presetId') presetId?: MarketDataPreset,
    @Query('query') filterBySearchQuery?: string,
    @Query('skip') skip?: number,
    @Query('sortColumn') sortColumn?: string,
    @Query('sortDirection') sortDirection?: Prisma.SortOrder,
    @Query('take') take?: number
  ): Promise<AssetProfilesResponse> {
    const filters = this.apiService.buildFiltersFromQueryParams({
      filterByAssetSubClasses,
      filterByDataSource,
      filterBySearchQuery
    });

    return this.assetProfilesService.getAssetProfiles({
      filters,
      presetId,
      sortColumn,
      sortDirection,
      skip: isNaN(skip) ? undefined : skip,
      take: isNaN(take) ? undefined : take
    });
  }

  @HasPermission(permissions.accessAdminControl)
  @Patch(':dataSource/:symbol')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async updateAssetProfileData(
    @Body() assetProfileData: UpdateAssetProfileDataDto,
    @Param('dataSource') dataSource: DataSource,
    @Param('symbol') symbol: string
  ): Promise<EnhancedSymbolProfile> {
    if (!this.request.user.settings.settings.isExperimentalFeatures) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    return this.assetProfilesService.updateAssetProfileData(
      { dataSource, symbol },
      assetProfileData
    );
  }
}
