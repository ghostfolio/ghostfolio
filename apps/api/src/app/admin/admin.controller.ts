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
import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';

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
  @HasPermission(permissions.accessAdminControl)
  public async getAdminData(): Promise<AdminData> {
    return this.adminService.get();
  }

  @Post('gather')
  @UseGuards(AuthGuard('jwt'))
  @HasPermission(permissions.accessAdminControl)
  public async gather7Days(): Promise<void> {
     this.dataGatheringService.gather7Days();
  }

  @Post('gather/max')
  @UseGuards(AuthGuard('jwt'))
  @HasPermission(permissions.accessAdminControl)
  public async gatherMax(): Promise<void> {
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
  @HasPermission(permissions.accessAdminControl)
  public async gatherProfileData(): Promise<void> {
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
  @HasPermission(permissions.accessAdminControl)
  public async gatherProfileDataForSymbol(
    @Param('dataSource') dataSource: DataSource,
    @Param('symbol') symbol: string
  ): Promise<void> {
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
  @HasPermission(permissions.accessAdminControl)
  public async gatherSymbol(
    @Param('dataSource') dataSource: DataSource,
    @Param('symbol') symbol: string
  ): Promise<void> {
    this.dataGatheringService.gatherSymbol({ dataSource, symbol });

    return;
  }

  @Post('gather/:dataSource/:symbol/:dateString')
  @UseGuards(AuthGuard('jwt'))
  @HasPermission(permissions.accessAdminControl)
  public async gatherSymbolForDate(
    @Param('dataSource') dataSource: DataSource,
    @Param('dateString') dateString: string,
    @Param('symbol') symbol: string
  ): Promise<MarketData> {
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
  @HasPermission(permissions.accessAdminControl)
  public async getMarketData(
    @Query('assetSubClasses') filterByAssetSubClasses?: string,
    @Query('presetId') presetId?: MarketDataPreset,
    @Query('query') filterBySearchQuery?: string,
    @Query('skip') skip?: number,
    @Query('sortColumn') sortColumn?: string,
    @Query('sortDirection') sortDirection?: Prisma.SortOrder,
    @Query('take') take?: number
  ): Promise<AdminMarketData> {
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
  @HasPermission(permissions.accessAdminControl)
  public async getMarketDataBySymbol(
    @Param('dataSource') dataSource: DataSource,
    @Param('symbol') symbol: string
  ): Promise<AdminMarketDataDetails> {
    return this.adminService.getMarketDataBySymbol({ dataSource, symbol });
  }

  @Post('market-data/:dataSource/:symbol')
  @UseGuards(AuthGuard('jwt'))
  @HasPermission(permissions.accessAdminControl)
  public async updateMarketData(
    @Body() data: UpdateBulkMarketDataDto,
    @Param('dataSource') dataSource: DataSource,
    @Param('symbol') symbol: string
  ) {
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
  @HasPermission(permissions.accessAdminControl)
  public async update(
    @Param('dataSource') dataSource: DataSource,
    @Param('dateString') dateString: string,
    @Param('symbol') symbol: string,
    @Body() data: UpdateMarketDataDto
  ) {
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
  @HasPermission(permissions.accessAdminControl)
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  public async addProfileData(
    @Param('dataSource') dataSource: DataSource,
    @Param('symbol') symbol: string
  ): Promise<SymbolProfile | never> {
    return this.adminService.addAssetProfile({
      dataSource,
      symbol,
      currency: this.request.user.Settings.settings.baseCurrency
    });
  }

  @Delete('profile-data/:dataSource/:symbol')
  @UseGuards(AuthGuard('jwt'))
  @HasPermission(permissions.accessAdminControl)
  public async deleteProfileData(
    @Param('dataSource') dataSource: DataSource,
    @Param('symbol') symbol: string
  ): Promise<void> {
    return this.adminService.deleteProfileData({ dataSource, symbol });
  }

  @Patch('profile-data/:dataSource/:symbol')
  @UseGuards(AuthGuard('jwt'))
  @HasPermission(permissions.accessAdminControl)
  public async patchAssetProfileData(
    @Body() assetProfileData: UpdateAssetProfileDto,
    @Param('dataSource') dataSource: DataSource,
    @Param('symbol') symbol: string
  ): Promise<EnhancedSymbolProfile> {
    return this.adminService.patchAssetProfileData({
      ...assetProfileData,
      dataSource,
      symbol
    });
  }

  @Put('settings/:key')
  @UseGuards(AuthGuard('jwt'))
  @HasPermission(permissions.accessAdminControl)
  public async updateProperty(
    @Param('key') key: string,
    @Body() data: PropertyDto
  ) {
    return await this.adminService.putSetting(key, data.value);
  }
}
