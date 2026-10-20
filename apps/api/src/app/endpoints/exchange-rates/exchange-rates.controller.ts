import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { ExchangeRateResponse } from '@ghostfolio/common/interfaces';

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

import { ExchangeRatesService } from './exchange-rates.service';

@Controller([
  'exchange-rates',
  /** @deprecated */
  'exchange-rate'
])
export class ExchangeRatesController {
  public constructor(
    private readonly exchangeRatesService: ExchangeRatesService
  ) {}

  @Get(':symbol/:dateString')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getExchangeRate(
    @Param('dateString') dateString: string,
    @Param('symbol') symbol: string
  ): Promise<ExchangeRateResponse> {
    const date = parseISO(dateString);

    const exchangeRate = await this.exchangeRatesService.getExchangeRate({
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
