import { AllowDuringImpersonation } from '@ghostfolio/api/decorators/allow-during-impersonation.decorator';
import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { Impersonation } from '@ghostfolio/api/decorators/impersonation.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { ImpersonationGuard } from '@ghostfolio/api/guards/impersonation.guard';
import { TransformDataSourceInRequestInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-request/transform-data-source-in-request.interceptor';
import { TransformDataSourceInResponseInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-response/transform-data-source-in-response.interceptor';
import { ApiService } from '@ghostfolio/api/services/api/api.service';
import { BenchmarkService } from '@ghostfolio/api/services/benchmark/benchmark.service';
import { getIntervalFromDateRange } from '@ghostfolio/common/calculation-helper';
import type {
  AssetProfileIdentifier,
  BenchmarkMarketDataDetailsResponse,
  BenchmarkResponse
} from '@ghostfolio/common/interfaces';
import { permissions } from '@ghostfolio/common/permissions';
import type { ImpersonationContext } from '@ghostfolio/common/types';

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  Post,
  Query,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DataSource } from '@prisma/client';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { BenchmarksService } from './benchmarks.service';
import { GetBenchmarkMarketDataDto } from './get-benchmark-market-data.dto';

@AllowDuringImpersonation()
@Controller('benchmarks')
export class BenchmarksController {
  public constructor(
    private readonly apiService: ApiService,
    private readonly benchmarkService: BenchmarkService,
    private readonly benchmarksService: BenchmarksService
  ) {}

  @HasPermission(permissions.accessAdminControl)
  @Post()
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async addBenchmark(
    @Body() { dataSource, symbol }: AssetProfileIdentifier
  ) {
    try {
      const benchmark = await this.benchmarkService.addBenchmark({
        dataSource,
        symbol
      });

      if (!benchmark) {
        throw new HttpException(
          getReasonPhrase(StatusCodes.NOT_FOUND),
          StatusCodes.NOT_FOUND
        );
      }

      return benchmark;
    } catch {
      throw new HttpException(
        getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR),
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete(':dataSource/:symbol')
  @HasPermission(permissions.accessAdminControl)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async deleteBenchmark(
    @Param('dataSource') dataSource: DataSource,
    @Param('symbol') symbol: string
  ) {
    try {
      const benchmark = await this.benchmarkService.deleteBenchmark({
        dataSource,
        symbol
      });

      if (!benchmark) {
        throw new HttpException(
          getReasonPhrase(StatusCodes.NOT_FOUND),
          StatusCodes.NOT_FOUND
        );
      }

      return benchmark;
    } catch {
      throw new HttpException(
        getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR),
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get()
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  @UseInterceptors(TransformDataSourceInResponseInterceptor)
  public async getBenchmark(): Promise<BenchmarkResponse> {
    return {
      benchmarks: await this.benchmarkService.getBenchmarks()
    };
  }

  @Get(':dataSource/:symbol/:startDateString')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard, ImpersonationGuard)
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  public async getBenchmarkMarketDataForUser(
    @Impersonation() { userId, userSettings }: ImpersonationContext,
    @Param('dataSource') dataSource: DataSource,
    @Param('startDateString') startDateString: string,
    @Param('symbol') symbol: string,
    @Query()
    {
      accounts,
      assetClasses,
      dataSource: filterByDataSource,
      range,
      symbol: filterBySymbol,
      tags,
      withExcludedAccounts
    }: GetBenchmarkMarketDataDto
  ): Promise<BenchmarkMarketDataDetailsResponse> {
    const { endDate, startDate } = getIntervalFromDateRange({
      dateRange: range,
      startDate: new Date(startDateString)
    });

    const filters = this.apiService.buildFiltersFromQueryParams({
      filterByDataSource,
      filterBySymbol,
      filterByAccounts: accounts,
      filterByAssetClasses: assetClasses,
      filterByTags: tags
    });

    return this.benchmarksService.getMarketDataForUser({
      dataSource,
      endDate,
      filters,
      startDate,
      symbol,
      userId,
      userSettings,
      withExcludedAccounts,
      dateRange: range
    });
  }
}
