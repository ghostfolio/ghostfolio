import { TransformDataSourceInRequestInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-request.interceptor';
import { TransformDataSourceInResponseInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-response.interceptor';
import {
  BenchmarkMarketDataDetails,
  BenchmarkResponse,
  UniqueAsset
} from '@ghostfolio/common/interfaces';
import {
  Body,
  Controller,
  Get,
  HttpException,
  Inject,
  Param,
  Post,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DataSource } from '@prisma/client';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { BenchmarkService } from './benchmark.service';
import { REQUEST } from '@nestjs/core';
import { RequestWithUser } from '@ghostfolio/common/types';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';
import { NotFoundError } from '@ghostfolio/common/exceptions';

@Controller('benchmark')
export class BenchmarkController {
  public constructor(
    private readonly benchmarkService: BenchmarkService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Get()
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  @UseInterceptors(TransformDataSourceInResponseInterceptor)
  public async getBenchmark(): Promise<BenchmarkResponse> {
    return {
      benchmarks: await this.benchmarkService.getBenchmarks()
    };
  }

  @Get(':dataSource/:symbol/:startDateString')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  public async getBenchmarkMarketDataBySymbol(
    @Param('dataSource') dataSource: DataSource,
    @Param('startDateString') startDateString: string,
    @Param('symbol') symbol: string
  ): Promise<BenchmarkMarketDataDetails> {
    const startDate = new Date(startDateString);

    return this.benchmarkService.getMarketDataBySymbol({
      dataSource,
      startDate,
      symbol
    });
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  public async addBenchmark(@Body() benchmark: UniqueAsset) {
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

    try {
      return await this.benchmarkService.addBenchmark(benchmark);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new HttpException(
          getReasonPhrase(StatusCodes.NOT_FOUND),
          StatusCodes.NOT_FOUND
        );
      } else {
        throw new HttpException(
          getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR),
          StatusCodes.INTERNAL_SERVER_ERROR
        );
      }
    }
  }
}
