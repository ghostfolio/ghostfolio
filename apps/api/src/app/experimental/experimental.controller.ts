import {
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  Inject,
  Param,
  Post
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { RequestWithUser } from 'apps/api/src/app/interfaces/request-with-user.type';
import { parse } from 'date-fns';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';
import { baseCurrency, benchmarks } from 'libs/helper/src';
import { isApiTokenAuthorized } from 'libs/helper/src';

import { CreateOrderDto } from './create-order.dto';
import { ExperimentalService } from './experimental.service';
import { Data } from './interfaces/data.interface';

@Controller('experimental')
export class ExperimentalController {
  public constructor(
    private readonly experimentalService: ExperimentalService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Get('benchmarks')
  public async getBenchmarks(
    @Headers('Authorization') apiToken: string
  ): Promise<string[]> {
    if (!isApiTokenAuthorized(apiToken)) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    return benchmarks;
  }

  @Get('benchmarks/:symbol')
  public async getBenchmark(
    @Headers('Authorization') apiToken: string,
    @Param('symbol') symbol: string
  ): Promise<{ date: Date; marketPrice: number }[]> {
    if (!isApiTokenAuthorized(apiToken)) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    const marketData = await this.experimentalService.getBenchmark(symbol);

    if (marketData?.length === 0) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    return marketData;
  }

  @Post('value/:dateString?')
  public async getValue(
    @Body() orders: CreateOrderDto[],
    @Headers('Authorization') apiToken: string,
    @Param('dateString') dateString: string
  ): Promise<Data> {
    if (!isApiTokenAuthorized(apiToken)) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    let date = new Date();

    if (dateString) {
      date = parse(dateString, 'yyyy-MM-dd', new Date());
    }

    return this.experimentalService.getValue(orders, date, baseCurrency);
  }
}
