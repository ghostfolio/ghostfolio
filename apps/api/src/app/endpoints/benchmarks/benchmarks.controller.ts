import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { TransformDataSourceInRequestInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-request/transform-data-source-in-request.interceptor';
import { TransformDataSourceInResponseInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-response/transform-data-source-in-response.interceptor';
import { ApiService } from '@ghostfolio/api/services/api/api.service';
import { BenchmarkService } from '@ghostfolio/api/services/benchmark/benchmark.service';
import { getIntervalFromDateRange } from '@ghostfolio/common/calculation-helper';
import { HEADER_KEY_IMPERSONATION } from '@ghostfolio/common/config';
import type {
  AssetProfileIdentifier,
  BenchmarkMarketDataDetails,
  BenchmarkResponse
} from '@ghostfolio/common/interfaces';
import { permissions } from '@ghostfolio/common/permissions';
import type { DateRange, RequestWithUser } from '@ghostfolio/common/types';

import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpException,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { DataSource } from '@prisma/client';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { BenchmarksService } from './benchmarks.service';

@Controller('benchmarks')
export class BenchmarksController {
  public constructor(
    private readonly apiService: ApiService,
    private readonly benchmarkService: BenchmarkService,
    private readonly benchmarksService: BenchmarksService,
    @Inject(REQUEST) private readonly request: RequestWithUser
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
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  public async getBenchmarkMarketDataForUser(
    @Headers(HEADER_KEY_IMPERSONATION.toLowerCase()) impersonationId: string,
    @Param('dataSource') dataSource: DataSource,
    @Param('startDateString') startDateString: string,
    @Param('symbol') symbol: string,
    @Query('range') dateRange: DateRange = 'max',
    @Query('accounts') filterByAccounts?: string,
    @Query('assetClasses') filterByAssetClasses?: string,
    @Query('dataSource') filterByDataSource?: string,
    @Query('symbol') filterBySymbol?: string,
    @Query('tags') filterByTags?: string,
    @Query('withExcludedAccounts') withExcludedAccountsParam = 'false'
  ): Promise<BenchmarkMarketDataDetails> {
    const { endDate, startDate } = getIntervalFromDateRange(
      dateRange,
      new Date(startDateString)
    );

    const filters = this.apiService.buildFiltersFromQueryParams({
      filterByAccounts,
      filterByAssetClasses,
      filterByDataSource,
      filterBySymbol,
      filterByTags
    });

    const withExcludedAccounts = withExcludedAccountsParam === 'true';

    return this.benchmarksService.getMarketDataForUser({
      dataSource,
      dateRange,
      endDate,
      filters,
      impersonationId,
      startDate,
      symbol,
      withExcludedAccounts,
      user: this.request.user
    });
  }
}
