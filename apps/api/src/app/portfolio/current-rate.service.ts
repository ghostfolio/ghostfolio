import { ActivitiesService } from '@ghostfolio/api/app/activities/activities.service';
import { LogPerformance } from '@ghostfolio/api/interceptors/performance-logging/performance-logging.interceptor';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
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
  private static readonly MARKET_DATA_PAGE_SIZE = 50000;

  public constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly dataProviderService: DataProviderService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly marketDataService: MarketDataService,
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

    const quoteErrors: ResponseError['errors'] = [];
    const today = resetHours(new Date());
    const values: GetValueObject[] = [];

    if (includesToday) {
      const quotesBySymbol = await this.dataProviderService.getQuotes({
        items: dataGatheringItems,
        user: this.request?.user
      });

      for (const { dataSource, symbol } of dataGatheringItems) {
        const quote = quotesBySymbol[symbol];

        if (quote?.dataProviderInfo) {
          dataProviderInfos.push(quote.dataProviderInfo);
        }

        if (quote?.marketPrice) {
          values.push({
            dataSource,
            symbol,
            date: today,
            marketPrice: quote.marketPrice
          });
        } else {
          quoteErrors.push({
            dataSource,
            symbol
          });
        }
      }
    }

    const assetProfileIdentifiers: AssetProfileIdentifier[] =
      dataGatheringItems.map(({ dataSource, symbol }) => {
        return { dataSource, symbol };
      });

    const marketDataCount = await this.marketDataService.getRangeCount({
      assetProfileIdentifiers,
      dateQuery
    });

    for (
      let i = 0;
      i < marketDataCount;
      i += CurrentRateService.MARKET_DATA_PAGE_SIZE
    ) {
      // Use page size to limit the number of records fetched at once
      const data = await this.marketDataService.getRange({
        assetProfileIdentifiers,
        dateQuery,
        skip: i,
        take: CurrentRateService.MARKET_DATA_PAGE_SIZE
      });

      values.push(
        ...data.map(({ dataSource, date, marketPrice, symbol }) => ({
          dataSource,
          date,
          marketPrice,
          symbol
        }))
      );
    }

    const response: GetValuesObject = {
      dataProviderInfos,
      errors: quoteErrors.map(({ dataSource, symbol }) => {
        return { dataSource, symbol };
      }),
      values: uniqBy(values, ({ date, symbol }) => {
        return `${date}-${symbol}`;
      })
    };

    if (!isEmpty(quoteErrors)) {
      for (const { dataSource, symbol } of quoteErrors) {
        try {
          // If missing quote, fallback to the latest available historical market price
          let value: GetValueObject = response.values.find((currentValue) => {
            return currentValue.symbol === symbol && isToday(currentValue.date);
          });

          if (!value) {
            const latestActivity =
              await this.activitiesService.getLatestActivity({
                dataSource,
                symbol
              });

            let marketPrice = latestActivity?.unitPrice ?? 0;

            if (latestActivity?.unitPrice && latestActivity.SymbolProfile) {
              const fromCurrency =
                latestActivity.currency ??
                latestActivity.SymbolProfile.currency;
              const toCurrency = latestActivity.SymbolProfile.currency;

              if (fromCurrency !== toCurrency) {
                const convertedPrice =
                  await this.exchangeRateDataService.toCurrencyAtDate(
                    latestActivity.unitPrice,
                    fromCurrency,
                    toCurrency,
                    latestActivity.date
                  );

                if (convertedPrice !== undefined) {
                  marketPrice = convertedPrice;
                }
              }
            }

            value = {
              dataSource,
              symbol,
              date: today,
              marketPrice
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
