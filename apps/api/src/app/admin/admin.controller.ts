import { TransformDataSourceInRequestInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-request.interceptor';
import { ApiService } from '@ghostfolio/api/services/api/api.service';
import { DataGatheringService } from '@ghostfolio/api/services/data-gathering/data-gathering.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { PropertyDto } from '@ghostfolio/api/services/property/property.dto';
import {
  GATHER_ASSET_PROFILE_PROCESS,
  GATHER_ASSET_PROFILE_PROCESS_OPTIONS
} from '@ghostfolio/common/config';
import {
  getAssetProfileIdentifier,
  resetHours
} from '@ghostfolio/common/helper';
import {
  AdminData,
  AdminMarketData,
  AdminMarketDataDetails,
  EnhancedSymbolProfile
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import type {
  MarketDataPreset,
  RequestWithUser
} from '@ghostfolio/common/types';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { DataSource, MarketData, Prisma, SymbolProfile } from '@prisma/client';
import { isDate, parseISO } from 'date-fns';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { AdminService } from './admin.service';
import { UpdateAssetProfileDto } from './update-asset-profile.dto';
import { UpdateBulkMarketDataDto } from './update-bulk-market-data.dto';
import { UpdateMarketDataDto } from './update-market-data.dto';

@Controller('admin')
export class AdminController {
  public constructor(
    private readonly adminService: AdminService,
    private readonly apiService: ApiService,
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

    await this.dataGatheringService.addJobsToQueue(
      uniqueAssets.map(({ dataSource, symbol }) => {
        return {
          data: {
            dataSource,
            symbol
          },
          name: GATHER_ASSET_PROFILE_PROCESS,
          opts: {
            ...GATHER_ASSET_PROFILE_PROCESS_OPTIONS,
            jobId: getAssetProfileIdentifier({ dataSource, symbol })
          }
        };
      })
    );

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

    await this.dataGatheringService.addJobsToQueue(
      uniqueAssets.map(({ dataSource, symbol }) => {
        return {
          data: {
            dataSource,
            symbol
          },
          name: GATHER_ASSET_PROFILE_PROCESS,
          opts: {
            ...GATHER_ASSET_PROFILE_PROCESS_OPTIONS,
            jobId: getAssetProfileIdentifier({ dataSource, symbol })
          }
        };
      })
    );
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

    await this.dataGatheringService.addJobToQueue({
      data: {
        dataSource,
        symbol
      },
      name: GATHER_ASSET_PROFILE_PROCESS,
      opts: {
        ...GATHER_ASSET_PROFILE_PROCESS_OPTIONS,
        jobId: getAssetProfileIdentifier({ dataSource, symbol })
      }
    });
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

    const date = parseISO(dateString);

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
  public async getMarketData(
    @Query('assetSubClasses') filterByAssetSubClasses?: string,
    @Query('presetId') presetId?: MarketDataPreset,
    @Query('query') filterBySearchQuery?: string,
    @Query('skip') skip?: number,
    @Query('sortColumn') sortColumn?: string,
    @Query('sortDirection') sortDirection?: Prisma.SortOrder,
    @Query('take') take?: number
  ): Promise<AdminMarketData> {
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

    const filters = this.apiService.buildFiltersFromQueryParams({
      filterByAssetSubClasses,
      filterBySearchQuery
    });

    return this.adminService.getMarketData({
      filters,
      presetId,
      sortColumn,
      sortDirection,
      skip: isNaN(skip) ? undefined : skip,
      take: isNaN(take) ? undefined : take
    });
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

  @Post('market-data/:dataSource/:symbol')
  @UseGuards(AuthGuard('jwt'))
  public async updateMarketData(
    @Body() data: UpdateBulkMarketDataDto,
    @Param('dataSource') dataSource: DataSource,
    @Param('symbol') symbol: string
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

    const dataBulkUpdate: Prisma.MarketDataUpdateInput[] = data.marketData.map(
      ({ date, marketPrice }) => ({
        dataSource,
        marketPrice,
        symbol,
        date: resetHours(parseISO(date)),
        state: 'CLOSE'
      })
    );

    return this.marketDataService.updateMany({
      data: dataBulkUpdate
    });
  }

  /**
   * @deprecated
   */
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

    const date = parseISO(dateString);

    return this.marketDataService.updateMarketData({
      data: { marketPrice: data.marketPrice, state: 'CLOSE' },
      where: {
        dataSource_date_symbol: {
          dataSource,
          date,
          symbol
        }
      }
    });
  }

  @Post('profile-data/:dataSource/:symbol')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  public async addProfileData(
    @Param('dataSource') dataSource: DataSource,
    @Param('symbol') symbol: string
  ): Promise<SymbolProfile | never> {
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
    return this.adminService.addAssetProfile({
      dataSource,
      symbol,
      currency: this.request.user.Settings.settings.baseCurrency
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

  @Patch('profile-data/:dataSource/:symbol')
  @UseGuards(AuthGuard('jwt'))
  public async patchAssetProfileData(
    @Body() assetProfileData: UpdateAssetProfileDto,
    @Param('dataSource') dataSource: DataSource,
    @Param('symbol') symbol: string
  ): Promise<EnhancedSymbolProfile> {
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

    return this.adminService.patchAssetProfileData({
      ...assetProfileData,
      dataSource,
      symbol
    });
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
