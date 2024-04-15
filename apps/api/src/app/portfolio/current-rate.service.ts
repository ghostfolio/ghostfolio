import { OrderService } from '@ghostfolio/api/app/order/order.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { resetHours } from '@ghostfolio/common/helper';
import {
  DataProviderInfo,
  ResponseError,
  UniqueAsset
} from '@ghostfolio/common/interfaces';
import type { RequestWithUser } from '@ghostfolio/common/types';

import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { isBefore, isToday } from 'date-fns';
import { flatten, isEmpty, uniqBy } from 'lodash';

import { GetValueObject } from './interfaces/get-value-object.interface';
import { GetValuesObject } from './interfaces/get-values-object.interface';
import { GetValuesParams } from './interfaces/get-values-params.interface';

@Injectable()
export class CurrentRateService {
  public constructor(
    private readonly dataProviderService: DataProviderService,
    private readonly marketDataService: MarketDataService,
    private readonly orderService: OrderService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  // TODO: Pass user instead of using this.request.user
  public async getValues({
    dataGatheringItems,
    dateQuery
  }: GetValuesParams): Promise<GetValuesObject> {
    const dataProviderInfos: DataProviderInfo[] = [];

    const includesToday =
      (!dateQuery.lt || isBefore(new Date(), dateQuery.lt)) &&
      (!dateQuery.gte || isBefore(dateQuery.gte, new Date())) &&
      (!dateQuery.in || this.containsToday(dateQuery.in));

    const promises: Promise<GetValueObject[]>[] = [];
    const quoteErrors: ResponseError['errors'] = [];
    const today = resetHours(new Date());

    if (includesToday) {
      promises.push(
        this.dataProviderService
          .getQuotes({ items: dataGatheringItems, user: this.request?.user })
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
                  dataSource: dataGatheringItem.dataSource,
                  date: today,
                  marketPrice:
                    dataResultProvider?.[dataGatheringItem.symbol]?.marketPrice,
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

    const uniqueAssets: UniqueAsset[] = dataGatheringItems.map(
      ({ dataSource, symbol }) => {
        return { dataSource, symbol };
      }
    );

    promises.push(
      this.marketDataService
        .getRange({
          dateQuery,
          uniqueAssets
        })
        .then((data) => {
          return data.map(({ dataSource, date, marketPrice, symbol }) => {
            return {
              dataSource,
              date,
              marketPrice,
              symbol
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
      for (const { dataSource, symbol } of quoteErrors) {
        try {
          // If missing quote, fallback to the latest available historical market price
          let value: GetValueObject = response.values.find((currentValue) => {
            return currentValue.symbol === symbol && isToday(currentValue.date);
          });

          if (!value) {
            // Fallback to unit price of latest activity
            const latestActivity = await this.orderService.getLatestOrder({
              dataSource,
              symbol
            });

            value = {
              dataSource,
              symbol,
              date: today,
              marketPrice: latestActivity?.unitPrice ?? 0
            };

            response.values.push(value);
          }

          const [latestValue] = response.values
            .filter((currentValue) => {
              return currentValue.symbol === symbol && currentValue.marketPrice;
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

          value.marketPrice = latestValue.marketPrice;
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
