import { TransformDataSourceInRequestInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-request.interceptor';
import { TransformDataSourceInResponseInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-response.interceptor';
import {
  BenchmarkMarketDataDetails,
  BenchmarkResponse
} from '@ghostfolio/common/interfaces';
import {
  Controller,
  Get,
  Param,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DataSource } from '@prisma/client';

import { BenchmarkService } from './benchmark.service';

@Controller('benchmark')
export class BenchmarkController {
  public constructor(private readonly benchmarkService: BenchmarkService) {}

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
}
