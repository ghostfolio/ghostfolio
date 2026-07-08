import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { TransformDataSourceInRequestInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-request/transform-data-source-in-request.interceptor';
import { BenchmarkService } from '@ghostfolio/api/services/benchmark/benchmark.service';
import { ManualService } from '@ghostfolio/api/services/data-provider/manual/manual.service';
import { DemoService } from '@ghostfolio/api/services/demo/demo.service';
import { DataGatheringService } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import { getIntervalFromDateRange } from '@ghostfolio/common/calculation-helper';
import {
  DATA_GATHERING_QUEUE_PRIORITY_HIGH,
  DATA_GATHERING_QUEUE_PRIORITY_MEDIUM,
  GATHER_ASSET_PROFILE_PROCESS_JOB_NAME,
  GATHER_ASSET_PROFILE_PROCESS_JOB_OPTIONS
} from '@ghostfolio/common/config';
import {
  UpdateAssetProfileDto,
  UpdatePropertyDto
} from '@ghostfolio/common/dtos';
import {
  canDeleteAssetProfile,
  getAssetProfileIdentifier
} from '@ghostfolio/common/helper';
import {
  AdminData,
  AdminUserResponse,
  AdminUsersResponse,
  EnhancedSymbolProfile,
  ScraperConfiguration
} from '@ghostfolio/common/interfaces';
import { permissions } from '@ghostfolio/common/permissions';
import type {
  DateRange,
  PropertyKey,
  RequestWithUser
} from '@ghostfolio/common/types';

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Inject,
  Logger,
  Param,
  ParseIntPipe,
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
import { PropertyKeyPipe } from './pipes/property-key.pipe';

@Controller('admin')
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  public constructor(
    private readonly adminService: AdminService,
    private readonly benchmarkService: BenchmarkService,
    private readonly dataGatheringService: DataGatheringService,
    private readonly demoService: DemoService,
    private readonly manualService: ManualService,
    @Inject(REQUEST) private readonly request: RequestWithUser,
    private readonly symbolProfileService: SymbolProfileService
  ) {}

  @Get()
  @HasPermission(permissions.accessAdminControl)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getAdminData(): Promise<AdminData> {
    return this.adminService.get();
  }

  @Get('demo-user/sync')
  @HasPermission(permissions.syncDemoUserAccount)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async syncDemoUserAccount(): Promise<Prisma.BatchPayload> {
    return this.demoService.syncDemoUserAccount();
  }

  @HasPermission(permissions.accessAdminControl)
  @Post('gather')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async gatherRecentMarketData(): Promise<void> {
    this.dataGatheringService.gatherRecentMarketData();
  }

  @HasPermission(permissions.accessAdminControl)
  @Post('gather/max')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async gatherMax(): Promise<void> {
    const assetProfileIdentifiers =
      await this.dataGatheringService.getActiveAssetProfileIdentifiers();

    await this.dataGatheringService.addJobsToQueue(
      assetProfileIdentifiers.map(({ dataSource, symbol }) => {
        return {
          data: {
            dataSource,
            symbol
          },
          name: GATHER_ASSET_PROFILE_PROCESS_JOB_NAME,
          opts: {
            ...GATHER_ASSET_PROFILE_PROCESS_JOB_OPTIONS,
            jobId: getAssetProfileIdentifier({ dataSource, symbol }),
            priority: DATA_GATHERING_QUEUE_PRIORITY_MEDIUM
          }
        };
      })
    );

    this.dataGatheringService.gatherMax();
  }

  @HasPermission(permissions.accessAdminControl)
  @Post('gather/profile-data')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async gatherProfileData(): Promise<void> {
    const assetProfileIdentifiers =
      await this.dataGatheringService.getActiveAssetProfileIdentifiers();

    await this.dataGatheringService.addJobsToQueue(
      assetProfileIdentifiers.map(({ dataSource, symbol }) => {
        return {
          data: {
            dataSource,
            symbol
          },
          name: GATHER_ASSET_PROFILE_PROCESS_JOB_NAME,
          opts: {
            ...GATHER_ASSET_PROFILE_PROCESS_JOB_OPTIONS,
            jobId: getAssetProfileIdentifier({ dataSource, symbol }),
            priority: DATA_GATHERING_QUEUE_PRIORITY_MEDIUM
          }
        };
      })
    );
  }

  @HasPermission(permissions.accessAdminControl)
  @Post('gather/profile-data/:dataSource/:symbol')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async gatherProfileDataForSymbol(
    @Param('dataSource') dataSource: DataSource,
    @Param('symbol') symbol: string
  ): Promise<void> {
    await this.dataGatheringService.addJobToQueue({
      data: {
        dataSource,
        symbol
      },
      name: GATHER_ASSET_PROFILE_PROCESS_JOB_NAME,
      opts: {
        ...GATHER_ASSET_PROFILE_PROCESS_JOB_OPTIONS,
        jobId: getAssetProfileIdentifier({ dataSource, symbol }),
        priority: DATA_GATHERING_QUEUE_PRIORITY_HIGH
      }
    });
  }

  @Post('gather/:dataSource/:symbol')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  @HasPermission(permissions.accessAdminControl)
  public async gatherSymbol(
    @Param('dataSource') dataSource: DataSource,
    @Param('symbol') symbol: string,
    @Query('range') dateRange: DateRange
  ): Promise<void> {
    let date: Date;

    if (dateRange) {
      const { startDate } = getIntervalFromDateRange({ dateRange });
      date = startDate;
    }

    this.dataGatheringService.gatherSymbol({
      dataSource,
      date,
      symbol
    });

    return;
  }

  @HasPermission(permissions.accessAdminControl)
  @Post('gather/:dataSource/:symbol/:dateString')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
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

  @HasPermission(permissions.accessAdminControl)
  @Post('market-data/:dataSource/:symbol/test')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async testMarketData(
    @Body() data: { scraperConfiguration: ScraperConfiguration },
    @Param('dataSource') dataSource: DataSource,
    @Param('symbol') symbol: string
  ): Promise<{ price: number }> {
    try {
      const price = await this.manualService.test({
        symbol,
        scraperConfiguration: data.scraperConfiguration
      });

      if (price) {
        return { price };
      }

      throw new Error(
        `Could not parse the market price for ${symbol} (${dataSource})`
      );
    } catch (error) {
      this.logger.error(error);

      throw new HttpException(error.message, StatusCodes.BAD_REQUEST);
    }
  }

  @HasPermission(permissions.accessAdminControl)
  @Post('profile-data/:dataSource/:symbol')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  public async addProfileData(
    @Param('dataSource') dataSource: DataSource,
    @Param('symbol') symbol: string
  ): Promise<SymbolProfile | never> {
    return this.adminService.addAssetProfile({
      dataSource,
      symbol,
      currency: this.request.user.settings.settings.baseCurrency
    });
  }

  @Delete('profile-data/:dataSource/:symbol')
  @HasPermission(permissions.accessAdminControl)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async deleteProfileData(
    @Param('dataSource') dataSource: DataSource,
    @Param('symbol') symbol: string
  ): Promise<void> {
    const [assetProfile] = await this.symbolProfileService.getSymbolProfiles([
      { dataSource, symbol }
    ]);

    if (assetProfile) {
      const benchmarkAssetProfiles =
        await this.benchmarkService.getBenchmarkAssetProfiles();

      const isBenchmark = benchmarkAssetProfiles.some(({ id }) => {
        return id === assetProfile.id;
      });

      if (
        !canDeleteAssetProfile({
          isBenchmark,
          activitiesCount: assetProfile.activitiesCount,
          symbol: assetProfile.symbol,
          watchedByCount: assetProfile.watchedByCount
        })
      ) {
        throw new HttpException(
          getReasonPhrase(StatusCodes.FORBIDDEN),
          StatusCodes.FORBIDDEN
        );
      }
    }

    return this.adminService.deleteProfileData({ dataSource, symbol });
  }

  @HasPermission(permissions.accessAdminControl)
  @Patch('profile-data/:dataSource/:symbol')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async patchAssetProfileData(
    @Body() assetProfile: UpdateAssetProfileDto,
    @Param('dataSource') dataSource: DataSource,
    @Param('symbol') symbol: string
  ): Promise<EnhancedSymbolProfile> {
    return this.adminService.patchAssetProfileData(
      { dataSource, symbol },
      assetProfile
    );
  }

  @HasPermission(permissions.accessAdminControl)
  @Put('settings/:key')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async updateProperty(
    @Param('key', PropertyKeyPipe) key: PropertyKey,
    @Body() data: UpdatePropertyDto
  ) {
    return this.adminService.putSetting(key, data.value);
  }

  @Get('user')
  @HasPermission(permissions.accessAdminControl)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getUsers(
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number
  ): Promise<AdminUsersResponse> {
    return this.adminService.getUsers({
      skip,
      take
    });
  }

  @Get('user/:id')
  @HasPermission(permissions.accessAdminControl)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getUser(@Param('id') id: string): Promise<AdminUserResponse> {
    return this.adminService.getUser(id);
  }
}
