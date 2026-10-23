import { TransformDataSourceInRequestInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-request/transform-data-source-in-request.interceptor';
import { TransformDataSourceInResponseInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-response/transform-data-source-in-response.interceptor';
import type { AssetResponse } from '@ghostfolio/common/interfaces';

import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { DataSource } from '@prisma/client';
import { pick } from 'lodash-es';

import { AssetProfilesService } from './asset-profiles.service';

@Controller('asset')
export class AssetController {
  public constructor(
    private readonly assetProfilesService: AssetProfilesService
  ) {}

  @Get(':dataSource/:symbol')
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  @UseInterceptors(TransformDataSourceInResponseInterceptor)
  public async getAsset(
    @Param('dataSource') dataSource: DataSource,
    @Param('symbol') symbol: string
  ): Promise<AssetResponse> {
    const { assetProfile, marketData, splits } =
      await this.assetProfilesService.getAssetProfile({
        dataSource,
        symbol
      });

    return {
      marketData,
      splits,
      assetProfile: {
        ...pick(assetProfile, ['dataSource', 'name', 'symbol']),
        // An index has no asset class and its value has no currency,
        // thus show no currency for any asset profile without asset class
        currency: assetProfile.assetClass ? assetProfile.currency : undefined
      }
    };
  }
}
