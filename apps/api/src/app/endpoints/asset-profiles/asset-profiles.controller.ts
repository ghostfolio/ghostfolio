import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { TransformDataSourceInRequestInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-request/transform-data-source-in-request.interceptor';
import { UpdateAssetProfileDataDto } from '@ghostfolio/common/dtos';
import { EnhancedSymbolProfile } from '@ghostfolio/common/interfaces';
import { permissions } from '@ghostfolio/common/permissions';

import {
  Body,
  Controller,
  Param,
  Patch,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DataSource } from '@prisma/client';

import { AssetProfilesService } from './asset-profiles.service';

@Controller('asset-profiles')
export class AssetProfilesController {
  public constructor(
    private readonly assetProfilesService: AssetProfilesService
  ) {}

  @HasPermission(permissions.accessAdminControl)
  @Patch(':dataSource/:symbol')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  public async updateAssetProfileData(
    @Body() assetProfileData: UpdateAssetProfileDataDto,
    @Param('dataSource') dataSource: DataSource,
    @Param('symbol') symbol: string
  ): Promise<EnhancedSymbolProfile> {
    return this.assetProfilesService.updateAssetProfileData(
      { dataSource, symbol },
      assetProfileData
    );
  }
}
