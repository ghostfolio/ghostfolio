import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';
import { Injectable } from '@nestjs/common';
import { Currency } from '@prisma/client';

import { MarketDataService } from './market-data.service';

@Injectable()
export class CurrentRateService {
  public constructor(
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly marketDataService: MarketDataService
  ) {}

  public async getValue({
    currency,
    date,
    symbol,
    userCurrency
  }: GetValueParams): Promise<number> {
    const marketData = await this.marketDataService.get({
      date,
      symbol
    });

    if (marketData) {
      return this.exchangeRateDataService.toCurrency(
        marketData.marketPrice,
        currency,
        userCurrency
      );
    }

    throw new Error(`Value not found for ${symbol} at ${date}`);
  }
}

export interface GetValueParams {
  date: Date;
  symbol: string;
  currency: Currency;
  userCurrency: Currency;
}
