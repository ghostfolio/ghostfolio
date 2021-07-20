import { DataProviderService } from '@ghostfolio/api/services/data-provider.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';
import { resetHours } from '@ghostfolio/common/helper';
import { Injectable } from '@nestjs/common';
import { Currency } from '@prisma/client';
import { isToday } from 'date-fns';

import { MarketDataService } from './market-data.service';

@Injectable()
export class CurrentRateService {
  public constructor(
    private readonly dataProviderService: DataProviderService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly marketDataService: MarketDataService
  ) {}

  public async getValue({
    currency,
    date,
    symbol,
    userCurrency
  }: GetValueParams): Promise<GetValueObject> {
    if (isToday(date)) {
      const dataProviderResult = await this.dataProviderService.get([symbol]);
      return {
        date: resetHours(date),
        marketPrice: dataProviderResult?.[symbol]?.marketPrice ?? 0
      };
    }

    const marketData = await this.marketDataService.get({
      date,
      symbol
    });

    if (marketData) {
      return {
        date: marketData.date,
        marketPrice: this.exchangeRateDataService.toCurrency(
          marketData.marketPrice,
          currency,
          userCurrency
        )
      };
    }

    throw new Error(`Value not found for ${symbol} at ${resetHours(date)}`);
  }

  public async getValues({
    currencies,
    dateRangeEnd,
    dateRangeStart,
    symbols,
    userCurrency
  }: GetValuesParams): Promise<GetValueObject[]> {
    const marketData = await this.marketDataService.getRange({
      dateRangeEnd,
      dateRangeStart,
      symbols
    });

    if (marketData) {
      return marketData.map((marketDataItem) => {
        return {
          date: marketDataItem.date,
          marketPrice: this.exchangeRateDataService.toCurrency(
            marketDataItem.marketPrice,
            currencies[marketDataItem.symbol],
            userCurrency
          )
        };
      });
    }

    throw new Error(
      `Values not found for symbols ${symbols.join(', ')} from ${resetHours(
        dateRangeStart
      )} to ${resetHours(dateRangeEnd)}`
    );
  }
}

export interface GetValueParams {
  date: Date;
  symbol: string;
  currency: Currency;
  userCurrency: Currency;
}

export interface GetValuesParams {
  dateRangeEnd: Date;
  dateRangeStart: Date;
  symbols: string[];
  currencies: { [symbol: string]: Currency };
  userCurrency: Currency;
}

export interface GetValueObject {
  date: Date;
  marketPrice: number;
}
