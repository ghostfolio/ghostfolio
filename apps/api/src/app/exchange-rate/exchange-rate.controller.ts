import { IDataProviderHistoricalResponse } from '@ghostfolio/api/services/interfaces/interfaces';
import {
  Controller,
  Get,
  HttpException,
  Param,
  UseGuards
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { ExchangeRateService } from './exchange-rate.service';

@Controller('exchange-rate')
export class ExchangeRateController {
  public constructor(
    private readonly exchangeRateService: ExchangeRateService
  ) {}

  @Get(':symbol/:dateString')
  @UseGuards(AuthGuard('jwt'))
  public async getExchangeRate(
    @Param('dateString') dateString: string,
    @Param('symbol') symbol: string
  ): Promise<IDataProviderHistoricalResponse> {
    const date = new Date(dateString);

    const { marketPrice } = await this.exchangeRateService.getExchangeRate({
      date,
      symbol
    });

    if (marketPrice) {
      return { marketPrice };
    }

    throw new HttpException(
      getReasonPhrase(StatusCodes.NOT_FOUND),
      StatusCodes.NOT_FOUND
    );
  }
}
