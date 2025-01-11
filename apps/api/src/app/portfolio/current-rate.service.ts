import { OrderService } from '@ghostfolio/api/app/order/order.service';
import { LogPerformance } from '@ghostfolio/api/interceptors/performance-logging/performance-logging.interceptor';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { resetHours } from '@ghostfolio/common/helper';
import {
  AssetProfileIdentifier,
  DataProviderInfo,
  ResponseError
} from '@ghostfolio/common/interfaces';
import type { RequestWithUser } from '@ghostfolio/common/types';

import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { isBefore, isToday } from 'date-fns';
import { isEmpty, uniqBy } from 'lodash';

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

  @LogPerformance
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

            for (const { dataSource, symbol } of dataGatheringItems) {
              if (dataResultProvider?.[symbol]?.dataProviderInfo) {
                dataProviderInfos.push(
                  dataResultProvider[symbol].dataProviderInfo
                );
              }

              if (dataResultProvider?.[symbol]?.marketPrice) {
                result.push({
                  dataSource,
                  symbol,
                  date: today,
                  marketPrice: dataResultProvider?.[symbol]?.marketPrice
                });
              } else {
                quoteErrors.push({
                  dataSource,
                  symbol
                });
              }
            }

            return result;
          })
      );
    }

    const assetProfileIdentifiers: AssetProfileIdentifier[] =
      dataGatheringItems.map(({ dataSource, symbol }) => {
        return { dataSource, symbol };
      });

    promises.push(
      this.marketDataService
        .getRange({
          assetProfileIdentifiers,
          dateQuery
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

    const values = await Promise.all(promises).then((array) => {
      return array.flat();
    });

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
