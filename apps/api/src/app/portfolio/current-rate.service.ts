import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { resetHours } from '@ghostfolio/common/helper';
import { DataProviderInfo, ResponseError } from '@ghostfolio/common/interfaces';
import { Injectable } from '@nestjs/common';
import { isBefore, isToday } from 'date-fns';
import { flatten, isEmpty, uniqBy } from 'lodash';

import { GetValueObject } from './interfaces/get-value-object.interface';
import { GetValuesObject } from './interfaces/get-values-object.interface';
import { GetValuesParams } from './interfaces/get-values-params.interface';

@Injectable()
export class CurrentRateService {
  public constructor(
    private readonly dataProviderService: DataProviderService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly marketDataService: MarketDataService
  ) {}

  public async getValues({
    currencies,
    dataGatheringItems,
    dateQuery,
    userCurrency
  }: GetValuesParams): Promise<GetValuesObject> {
    const dataProviderInfos: DataProviderInfo[] = [];
    const includeToday =
      (!dateQuery.lt || isBefore(new Date(), dateQuery.lt)) &&
      (!dateQuery.gte || isBefore(dateQuery.gte, new Date())) &&
      (!dateQuery.in || this.containsToday(dateQuery.in));

    const promises: Promise<GetValueObject[]>[] = [];
    const quoteErrors: ResponseError['errors'] = [];
    const today = resetHours(new Date());

    if (includeToday) {
      promises.push(
        this.dataProviderService
          .getQuotes(dataGatheringItems)
          .then((dataResultProvider) => {
            const result: GetValueObject[] = [];
            for (const dataGatheringItem of dataGatheringItems) {
              if (
                dataResultProvider?.[dataGatheringItem.symbol]?.dataProviderInfo
              ) {
                dataProviderInfos.push(
                  dataResultProvider[dataGatheringItem.symbol].dataProviderInfo
                );
              }

              if (dataResultProvider?.[dataGatheringItem.symbol]?.marketPrice) {
                result.push({
                  date: today,
                  marketPriceInBaseCurrency:
                    this.exchangeRateDataService.toCurrency(
                      dataResultProvider?.[dataGatheringItem.symbol]
                        ?.marketPrice,
                      dataResultProvider?.[dataGatheringItem.symbol]?.currency,
                      userCurrency
                    ),
                  symbol: dataGatheringItem.symbol
                });
              } else {
                quoteErrors.push({
                  dataSource: dataGatheringItem.dataSource,
                  symbol: dataGatheringItem.symbol
                });
              }
            }

            return result;
          })
      );
    }

    const symbols = dataGatheringItems.map((dataGatheringItem) => {
      return dataGatheringItem.symbol;
    });

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
              marketPriceInBaseCurrency:
                this.exchangeRateDataService.toCurrency(
                  marketDataItem.marketPrice,
                  currencies[marketDataItem.symbol],
                  userCurrency
                ),
              symbol: marketDataItem.symbol
            };
          });
        })
    );

    const values = flatten(await Promise.all(promises));

    const response: GetValuesObject = {
      dataProviderInfos,
      errors: quoteErrors.map(({ dataSource, symbol }) => {
        return { dataSource, symbol };
      }),
      values: uniqBy(values, ({ date, symbol }) => `${date}-${symbol}`)
    };

    if (!isEmpty(quoteErrors)) {
      for (const { symbol } of quoteErrors) {
        try {
          // If missing quote, fallback to the latest available historical market price
          let value: GetValueObject = response.values.find((currentValue) => {
            return currentValue.symbol === symbol && isToday(currentValue.date);
          });

          if (!value) {
            value = {
              symbol,
              date: today,
              marketPriceInBaseCurrency: 0
            };

            response.values.push(value);
          }

          const [latestValue] = response.values
            .filter((currentValue) => {
              return (
                currentValue.symbol === symbol &&
                currentValue.marketPriceInBaseCurrency
              );
            })
            .sort((a, b) => {
              if (a.date < b.date) {
                return 1;
              }

              if (a.date > b.date) {
                return -1;
              }

              return 0;
            });

          value.marketPriceInBaseCurrency =
            latestValue.marketPriceInBaseCurrency;
        } catch {}
      }
    }

    return response;
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
