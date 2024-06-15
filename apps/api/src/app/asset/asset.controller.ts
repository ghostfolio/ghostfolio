import { AdminService } from '@ghostfolio/api/app/admin/admin.service';
import { TransformDataSourceInRequestInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-request/transform-data-source-in-request.interceptor';
import { TransformDataSourceInResponseInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-response/transform-data-source-in-response.interceptor';
import type { AdminMarketDataDetails } from '@ghostfolio/common/interfaces';

import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { DataSource } from '@prisma/client';
import { pick } from 'lodash';

@Controller('asset')
export class AssetController {
  public constructor(private readonly adminService: AdminService) {}

  @Get(':dataSource/:symbol')
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  @UseInterceptors(TransformDataSourceInResponseInterceptor)
  public async getAsset(
    @Param('dataSource') dataSource: DataSource,
    @Param('symbol') symbol: string
  ): Promise<AdminMarketDataDetails> {
    const { assetProfile, marketData } =
      await this.adminService.getMarketDataBySymbol({ dataSource, symbol });

    return {
      marketData,
      assetProfile: pick(assetProfile, ['dataSource', 'name', 'symbol'])
    };
  }
}
