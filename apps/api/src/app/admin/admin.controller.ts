import { DataGatheringService } from '@ghostfolio/api/services/data-gathering.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data.service';
import { PropertyDto } from '@ghostfolio/api/services/property/property.dto';
import {
  GATHER_ASSET_PROFILE_PROCESS,
  GATHER_ASSET_PROFILE_PROCESS_OPTIONS
} from '@ghostfolio/common/config';
import {
  AdminData,
  AdminMarketData,
  AdminMarketDataDetails
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import type { RequestWithUser } from '@ghostfolio/common/types';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Inject,
  Param,
  Post,
  Put,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { DataSource, MarketData } from '@prisma/client';
import { isDate } from 'date-fns';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { AdminService } from './admin.service';
import { UpdateMarketDataDto } from './update-market-data.dto';

@Controller('admin')
export class AdminController {
  public constructor(
    private readonly adminService: AdminService,
    private readonly dataGatheringService: DataGatheringService,
    private readonly marketDataService: MarketDataService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  public async getAdminData(): Promise<AdminData> {
    if (
      !hasPermission(
        this.request.user.permissions,
        permissions.accessAdminControl
      )
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    return this.adminService.get();
  }

  @Post('gather')
  @UseGuards(AuthGuard('jwt'))
  public async gather7Days(): Promise<void> {
    if (
      !hasPermission(
        this.request.user.permissions,
        permissions.accessAdminControl
      )
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    this.dataGatheringService.gather7Days();
  }

  @Post('gather/max')
  @UseGuards(AuthGuard('jwt'))
  public async gatherMax(): Promise<void> {
    if (
      !hasPermission(
        this.request.user.permissions,
        permissions.accessAdminControl
      )
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    const uniqueAssets = await this.dataGatheringService.getUniqueAssets();

    for (const { dataSource, symbol } of uniqueAssets) {
      await this.dataGatheringService.addJobToQueue(
        GATHER_ASSET_PROFILE_PROCESS,
        {
          dataSource,
          symbol
        },
        GATHER_ASSET_PROFILE_PROCESS_OPTIONS
      );
    }

    this.dataGatheringService.gatherMax();
  }

  @Post('gather/profile-data')
  @UseGuards(AuthGuard('jwt'))
  public async gatherProfileData(): Promise<void> {
    if (
      !hasPermission(
        this.request.user.permissions,
        permissions.accessAdminControl
      )
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    const uniqueAssets = await this.dataGatheringService.getUniqueAssets();

    for (const { dataSource, symbol } of uniqueAssets) {
      await this.dataGatheringService.addJobToQueue(
        GATHER_ASSET_PROFILE_PROCESS,
        {
          dataSource,
          symbol
        },
        GATHER_ASSET_PROFILE_PROCESS_OPTIONS
      );
    }
  }

  @Post('gather/profile-data/:dataSource/:symbol')
  @UseGuards(AuthGuard('jwt'))
  public async gatherProfileDataForSymbol(
    @Param('dataSource') dataSource: DataSource,
    @Param('symbol') symbol: string
  ): Promise<void> {
    if (
      !hasPermission(
        this.request.user.permissions,
        permissions.accessAdminControl
      )
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    await this.dataGatheringService.addJobToQueue(
      GATHER_ASSET_PROFILE_PROCESS,
      {
        dataSource,
        symbol
      },
      GATHER_ASSET_PROFILE_PROCESS_OPTIONS
    );
  }

  @Post('gather/:dataSource/:symbol')
  @UseGuards(AuthGuard('jwt'))
  public async gatherSymbol(
    @Param('dataSource') dataSource: DataSource,
    @Param('symbol') symbol: string
  ): Promise<void> {
    if (
      !hasPermission(
        this.request.user.permissions,
        permissions.accessAdminControl
      )
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    this.dataGatheringService.gatherSymbol({ dataSource, symbol });

    return;
  }

  @Post('gather/:dataSource/:symbol/:dateString')
  @UseGuards(AuthGuard('jwt'))
  public async gatherSymbolForDate(
    @Param('dataSource') dataSource: DataSource,
    @Param('dateString') dateString: string,
    @Param('symbol') symbol: string
  ): Promise<MarketData> {
    if (
      !hasPermission(
        this.request.user.permissions,
        permissions.accessAdminControl
      )
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    const date = new Date(dateString);

    if (!isDate(date)) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.BAD_REQUEST),
        StatusCodes.BAD_REQUEST
      );
    }

    return this.dataGatheringService.gatherSymbolForDate({
      dataSource,
      date,
      symbol
    });
  }

  @Get('market-data')
  @UseGuards(AuthGuard('jwt'))
  public async getMarketData(): Promise<AdminMarketData> {
    if (
      !hasPermission(
        this.request.user.permissions,
        permissions.accessAdminControl
      )
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    return this.adminService.getMarketData();
  }

  @Get('market-data/:dataSource/:symbol')
  @UseGuards(AuthGuard('jwt'))
  public async getMarketDataBySymbol(
    @Param('dataSource') dataSource: DataSource,
    @Param('symbol') symbol: string
  ): Promise<AdminMarketDataDetails> {
    if (
      !hasPermission(
        this.request.user.permissions,
        permissions.accessAdminControl
      )
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    return this.adminService.getMarketDataBySymbol({ dataSource, symbol });
  }

  @Put('market-data/:dataSource/:symbol/:dateString')
  @UseGuards(AuthGuard('jwt'))
  public async update(
    @Param('dataSource') dataSource: DataSource,
    @Param('dateString') dateString: string,
    @Param('symbol') symbol: string,
    @Body() data: UpdateMarketDataDto
  ) {
    if (
      !hasPermission(
        this.request.user.permissions,
        permissions.accessAdminControl
      )
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    const date = new Date(dateString);

    return this.marketDataService.updateMarketData({
      data: { ...data, dataSource },
      where: {
        date_symbol: {
          date,
          symbol
        }
      }
    });
  }

  @Delete('profile-data/:dataSource/:symbol')
  @UseGuards(AuthGuard('jwt'))
  public async deleteProfileData(
    @Param('dataSource') dataSource: DataSource,
    @Param('symbol') symbol: string
  ): Promise<void> {
    if (
      !hasPermission(
        this.request.user.permissions,
        permissions.accessAdminControl
      )
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    return this.adminService.deleteProfileData({ dataSource, symbol });
  }

  @Put('settings/:key')
  @UseGuards(AuthGuard('jwt'))
  public async updateProperty(
    @Param('key') key: string,
    @Body() data: PropertyDto
  ) {
    if (
      !hasPermission(
        this.request.user.permissions,
        permissions.accessAdminControl
      )
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    return await this.adminService.putSetting(key, data.value);
  }
}
