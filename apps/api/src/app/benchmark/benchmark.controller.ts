import { TransformDataSourceInRequestInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-request.interceptor';
import { TransformDataSourceInResponseInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-response.interceptor';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import { PROPERTY_BENCHMARKS } from '@ghostfolio/common/config';
import { BenchmarkResponse, UniqueAsset } from '@ghostfolio/common/interfaces';
import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { BenchmarkService } from './benchmark.service';

@Controller('benchmark')
export class BenchmarkController {
  public constructor(
    private readonly benchmarkService: BenchmarkService,
    private readonly propertyService: PropertyService
  ) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  @UseInterceptors(TransformDataSourceInResponseInterceptor)
  public async getBenchmark(): Promise<BenchmarkResponse> {
    const benchmarkAssets: UniqueAsset[] =
      ((await this.propertyService.getByKey(
        PROPERTY_BENCHMARKS
      )) as UniqueAsset[]) ?? [];

    return {
      benchmarks: await this.benchmarkService.getBenchmarks(benchmarkAssets)
    };
  }
}
