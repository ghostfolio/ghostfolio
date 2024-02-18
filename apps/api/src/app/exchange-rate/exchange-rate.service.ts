import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';

import { Injectable } from '@nestjs/common';

@Injectable()
export class ExchangeRateService {
  public constructor(
    private readonly exchangeRateDataService: ExchangeRateDataService
  ) {}

  public async getExchangeRate({
    date,
    symbol
  }: {
    date: Date;
    symbol: string;
  }): Promise<number> {
    const [currency1, currency2] = symbol.split('-');

    return this.exchangeRateDataService.toCurrencyAtDate(
      1,
      currency1,
      currency2,
      date
    );
  }
}
