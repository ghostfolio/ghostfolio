import { DataProviderService } from '@ghostfolio/api/services/data-provider.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';
import { resetHours } from '@ghostfolio/common/helper';
import { Injectable } from '@nestjs/common';
import { isBefore, isToday } from 'date-fns';

import { MarketDataService } from './market-data.service';
import { GetValueObject } from '@ghostfolio/api/app/core/get-value.object';
import { GetValuesParams } from '@ghostfolio/api/app/core/get-values.params';
import { GetValueParams } from '@ghostfolio/api/app/core/get-value.params';
import { flatten } from 'lodash';

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
    const includeToday =
      (!dateQuery.lt || isBefore(new Date(), dateQuery.lt)) &&
      (!dateQuery.gte || isBefore(dateQuery.gte, new Date())) &&
      (!dateQuery.in || this.containsToday(dateQuery.in));

    const promises: Promise<
      {
        date: Date;
        symbol: string;
        marketPrice: number;
      }[]
    >[] = [];

    if (includeToday) {
      const today = resetHours(new Date());
      promises.push(
        this.dataProviderService.get(symbols).then((dataResultProvider) => {
          const result = [];
          for (const symbol of symbols) {
            result.push({
              date: today,
              symbol: symbol,
              marketPrice: dataResultProvider?.[symbol]?.marketPrice ?? 0
            });
          }
          return result;
        })
      );
    }

    promises.push(
      this.marketDataService
        .getRange({
          dateQuery,
          symbols
        })
        .then((data) => {
          return data.map((marketDataItem) => {
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
        })
    );

    return flatten(await Promise.all(promises));
  }

  private containsToday(dates: Date[]): boolean {
    for (const date of dates) {
      if (isToday(date)) {
        return true;
      }
    }
    return false;
  }
}
