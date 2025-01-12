import { TransformDataSourceInRequestInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-request/transform-data-source-in-request.interceptor';

import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Res,
  UseInterceptors
} from '@nestjs/common';
import { DataSource } from '@prisma/client';
import { Response } from 'express';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  public constructor(private readonly healthService: HealthService) {}

  @Get()
  public async getHealth(@Res() response: Response) {
    const databaseServiceHealthy = await this.healthService.isDatabaseHealthy();
    const redisCacheServiceHealthy =
      await this.healthService.isRedisCacheHealthy();

    if (databaseServiceHealthy && redisCacheServiceHealthy) {
      return response
        .status(HttpStatus.OK)
        .json({ status: getReasonPhrase(StatusCodes.OK) });
    } else {
      return response
        .status(HttpStatus.SERVICE_UNAVAILABLE)
        .json({ status: getReasonPhrase(StatusCodes.SERVICE_UNAVAILABLE) });
    }
  }

  @Get('data-enhancer/:name')
  public async getHealthOfDataEnhancer(@Param('name') name: string) {
    const hasResponse =
      await this.healthService.hasResponseFromDataEnhancer(name);

    if (hasResponse !== true) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.SERVICE_UNAVAILABLE),
        StatusCodes.SERVICE_UNAVAILABLE
      );
    }
  }

  @Get('data-provider/:dataSource')
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  public async getHealthOfDataProvider(
    @Param('dataSource') dataSource: DataSource
  ) {
    if (!DataSource[dataSource]) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    const hasResponse =
      await this.healthService.hasResponseFromDataProvider(dataSource);

    if (hasResponse !== true) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.SERVICE_UNAVAILABLE),
        StatusCodes.SERVICE_UNAVAILABLE
      );
    }
  }
}
