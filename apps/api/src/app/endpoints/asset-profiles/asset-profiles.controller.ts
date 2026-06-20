import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { TransformDataSourceInRequestInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-request/transform-data-source-in-request.interceptor';
import { TransformDataSourceInResponseInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-response/transform-data-source-in-response.interceptor';
import { ApiService } from '@ghostfolio/api/services/api/api.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import { UpdateAssetProfileDataDto } from '@ghostfolio/common/dtos';
import { getCurrencyFromSymbol, isCurrency } from '@ghostfolio/common/helper';
import { AssetProfileResponse } from '@ghostfolio/common/interfaces';
import {
  AssetProfilesResponse,
  EnhancedSymbolProfile
} from '@ghostfolio/common/interfaces';
import { hasPermission } from '@ghostfolio/common/permissions';
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
  UseGuards,
  UseInterceptors
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
    @Inject(REQUEST) private readonly request: RequestWithUser,
    private readonly symbolProfileService: SymbolProfileService
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

  @Get(':dataSource/:symbol')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  @UseInterceptors(TransformDataSourceInResponseInterceptor)
  public async getAssetProfile(
    @Param('dataSource') dataSource: DataSource,
    @Param('symbol') symbol: string
  ): Promise<AssetProfileResponse> {
    const [assetProfile] = await this.symbolProfileService.getSymbolProfiles([
      { dataSource, symbol }
    ]);

    if (!assetProfile && !isCurrency(getCurrencyFromSymbol(symbol))) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    const canReadAllAssetProfiles = hasPermission(
      this.request.user.permissions,
      permissions.readMarketData
    );

    const canReadOwnAssetProfile =
      assetProfile?.userId === this.request.user.id &&
      hasPermission(
        this.request.user.permissions,
        permissions.readMarketDataOfOwnAssetProfile
      );

    if (!canReadAllAssetProfiles && !canReadOwnAssetProfile) {
      throw new HttpException(
        assetProfile?.userId
          ? getReasonPhrase(StatusCodes.NOT_FOUND)
          : getReasonPhrase(StatusCodes.FORBIDDEN),
        assetProfile?.userId ? StatusCodes.NOT_FOUND : StatusCodes.FORBIDDEN
      );
    }

    return this.assetProfilesService.getAssetProfile({
      dataSource,
      symbol
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
