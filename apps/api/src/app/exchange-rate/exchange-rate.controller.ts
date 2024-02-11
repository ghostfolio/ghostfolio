import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { IDataProviderHistoricalResponse } from '@ghostfolio/api/services/interfaces/interfaces';

import {
  Controller,
  Get,
  HttpException,
  Param,
  UseGuards
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { parseISO } from 'date-fns';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { ExchangeRateService } from './exchange-rate.service';

@Controller('exchange-rate')
export class ExchangeRateController {
  public constructor(
    private readonly exchangeRateService: ExchangeRateService
  ) {}

  @Get(':symbol/:dateString')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getExchangeRate(
    @Param('dateString') dateString: string,
    @Param('symbol') symbol: string
  ): Promise<IDataProviderHistoricalResponse> {
    const date = parseISO(dateString);

    const exchangeRate = await this.exchangeRateService.getExchangeRate({
      date,
      symbol
    });

    if (exchangeRate) {
      return { marketPrice: exchangeRate };
    }

    throw new HttpException(
      getReasonPhrase(StatusCodes.NOT_FOUND),
      StatusCodes.NOT_FOUND
    );
  }
}
