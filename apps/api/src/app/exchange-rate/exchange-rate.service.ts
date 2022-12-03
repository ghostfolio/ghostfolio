import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';
import { IDataProviderHistoricalResponse } from '@ghostfolio/api/services/interfaces/interfaces';
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
  }): Promise<IDataProviderHistoricalResponse> {
    const [currency1, currency2] = symbol.split('-');

    const marketPrice = await this.exchangeRateDataService.toCurrencyAtDate(
      1,
      currency1,
      currency2,
      date
    );

    return { marketPrice };
  }
}
