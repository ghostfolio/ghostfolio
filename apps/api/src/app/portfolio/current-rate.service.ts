import { ActivitiesService } from '@ghostfolio/api/app/activities/activities.service';
import { LogPerformance } from '@ghostfolio/api/interceptors/performance-logging/performance-logging.interceptor';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import {
  getAssetProfileIdentifier,
  resetHours
} from '@ghostfolio/common/helper';
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
      values: uniqBy(values, ({ dataSource, date, symbol }) => {
        return `${date}-${getAssetProfileIdentifier({ dataSource, symbol })}`;
      })
    };

    if (!isEmpty(quoteErrors)) {
      const unresolvedErrors: ResponseError['errors'] = [];

      for (const { dataSource, symbol } of quoteErrors) {
        try {
          const latestHistoricalValue = response.values
            .filter((currentValue) => {
              return (
                currentValue.dataSource === dataSource &&
                isBefore(currentValue.date, today) &&
                currentValue.marketPrice > 0 &&
                currentValue.symbol === symbol
              );
            })
            .sort((a, b) => b.date.getTime() - a.date.getTime())[0];

          let marketPrice = latestHistoricalValue?.marketPrice ?? 0;

          if (marketPrice <= 0) {
            const latestActivity =
              await this.activitiesService.getLatestActivity({
                dataSource,
                symbol
              });

            marketPrice = latestActivity?.unitPrice ?? 0;
          }

          if (marketPrice > 0) {
            response.values.push({
              dataSource,
              symbol,
              date: today,
              marketPrice
            });
          } else {
            unresolvedErrors.push({ dataSource, symbol });
          }
        } catch {
          unresolvedErrors.push({ dataSource, symbol });
        }
      }

      response.errors = unresolvedErrors;
      response.values = uniqBy(
        response.values,
        ({ dataSource, date, symbol }) => {
          return `${date}-${getAssetProfileIdentifier({ dataSource, symbol })}`;
        }
      );
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
