import { DataProviderService } from '@ghostfolio/api/services/data-provider.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';
import { resetHours } from '@ghostfolio/common/helper';
import { Injectable } from '@nestjs/common';
import { Currency } from '@prisma/client';
import { isToday } from 'date-fns';

import { DateQuery, MarketDataService } from './market-data.service';

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
        marketPrice: dataProviderResult?.[symbol]?.marketPrice ?? 0,
        symbol: symbol
      };
    }

    const marketData = await this.marketDataService.get({
      date,
      symbol
    });

    if (marketData) {
      return {
        date: marketData.date,
        symbol: marketData.symbol,
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
    dateQuery,
    symbols,
    userCurrency
  }: GetValuesParams): Promise<GetValueObject[]> {
    const marketData = await this.marketDataService.getRange({
      dateQuery,
      symbols
    });

    if (marketData) {
      return marketData.map((marketDataItem) => {
        return {
          date: marketDataItem.date,
          symbol: marketDataItem.symbol,
          marketPrice: this.exchangeRateDataService.toCurrency(
            marketDataItem.marketPrice,
            currencies[marketDataItem.symbol],
            userCurrency
          )
        };
      });
    }

    throw new Error(`Values not found for symbols ${symbols.join(', ')}`);
  }
}

export interface GetValueParams {
  date: Date;
  symbol: string;
  currency: Currency;
  userCurrency: Currency;
}

export interface GetValuesParams {
  dateQuery: DateQuery;
  symbols: string[];
  currencies: { [symbol: string]: Currency };
  userCurrency: Currency;
}

export interface GetValueObject {
  date: Date;
  symbol: string;
  marketPrice: number;
}
