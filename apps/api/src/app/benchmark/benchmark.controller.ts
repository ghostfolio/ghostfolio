import { TransformDataSourceInRequestInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-request.interceptor';
import { TransformDataSourceInResponseInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-response.interceptor';
import { BenchmarkResponse } from '@ghostfolio/common/interfaces';
import { Controller, Get, UseInterceptors } from '@nestjs/common';

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
}
