import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { UpdateAssetProfileDataDto } from '@ghostfolio/common/dtos';
import { EnhancedSymbolProfile } from '@ghostfolio/common/interfaces';
import { permissions } from '@ghostfolio/common/permissions';
import { RequestWithUser } from '@ghostfolio/common/types';

import {
  Body,
  Controller,
  HttpException,
  Inject,
  Param,
  Patch,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { DataSource } from '@prisma/client';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { AssetProfilesService } from './asset-profiles.service';

@Controller('asset-profiles')
export class AssetProfilesController {
  public constructor(
    private readonly assetProfilesService: AssetProfilesService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

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
