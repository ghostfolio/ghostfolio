import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import {
  GetDividendsParams,
  GetHistoricalParams,
  GetQuotesParams,
  GetSearchParams
} from '@ghostfolio/api/services/data-provider/interfaces/data-provider.interface';
import { IDataProviderHistoricalResponse } from '@ghostfolio/api/services/interfaces/interfaces';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import {
  DEFAULT_CURRENCY,
  DERIVED_CURRENCIES
} from '@ghostfolio/common/config';
import { PROPERTY_DATA_SOURCES_GHOSTFOLIO_DATA_PROVIDER_MAX_REQUESTS } from '@ghostfolio/common/config';
import {
  DataProviderInfo,
  DividendsResponse,
  HistoricalResponse,
  LookupItem,
  LookupResponse,
  QuotesResponse
} from '@ghostfolio/common/interfaces';

import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from '@prisma/client';
import { Big } from 'big.js';

@Injectable()
export class GhostfolioService {
  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly dataProviderService: DataProviderService,
    private readonly prismaService: PrismaService,
    private readonly propertyService: PropertyService
  ) {}

  public async getDividends({
    from,
    granularity,
    requestTimeout = this.configurationService.get('REQUEST_TIMEOUT'),
    symbol,
    to
  }: GetDividendsParams) {
    const result: DividendsResponse = { dividends: {} };

    try {
      const promises: Promise<{
        [date: string]: IDataProviderHistoricalResponse;
      }>[] = [];

      for (const dataProviderService of this.getDataProviderServices()) {
        promises.push(
          dataProviderService
            .getDividends({
              from,
              granularity,
              requestTimeout,
              symbol,
              to
            })
            .then((dividends) => {
              result.dividends = dividends;

              return dividends;
            })
        );
      }

      await Promise.all(promises);

      return result;
    } catch (error) {
      Logger.error(error, 'GhostfolioService');

      throw error;
    }
  }

  public async getHistorical({
    from,
    granularity,
    requestTimeout,
    to,
    symbol
  }: GetHistoricalParams) {
    const result: HistoricalResponse = { historicalData: {} };

    try {
      const promises: Promise<{
        [symbol: string]: { [date: string]: IDataProviderHistoricalResponse };
      }>[] = [];

      for (const dataProviderService of this.getDataProviderServices()) {
        promises.push(
          dataProviderService
            .getHistorical({
              from,
              granularity,
              requestTimeout,
              symbol,
              to
            })
            .then((historicalData) => {
              result.historicalData = historicalData[symbol];

              return historicalData;
            })
        );
      }

      await Promise.all(promises);

      return result;
    } catch (error) {
      Logger.error(error, 'GhostfolioService');

      throw error;
    }
  }

  public async getMaxDailyRequests() {
    return parseInt(
      ((await this.propertyService.getByKey(
        PROPERTY_DATA_SOURCES_GHOSTFOLIO_DATA_PROVIDER_MAX_REQUESTS
      )) as string) || '0',
      10
    );
  }

  public async getQuotes({ requestTimeout, symbols }: GetQuotesParams) {
    const results: QuotesResponse = { quotes: {} };

    try {
      const promises: Promise<any>[] = [];

      for (const dataProvider of this.getDataProviderServices()) {
        const maximumNumberOfSymbolsPerRequest =
          dataProvider.getMaxNumberOfSymbolsPerRequest?.() ??
          Number.MAX_SAFE_INTEGER;

        for (
          let i = 0;
          i < symbols.length;
          i += maximumNumberOfSymbolsPerRequest
        ) {
          const symbolsChunk = symbols.slice(
            i,
            i + maximumNumberOfSymbolsPerRequest
          );

          const promise = Promise.resolve(
            dataProvider.getQuotes({ requestTimeout, symbols: symbolsChunk })
          );

          promises.push(
            promise.then(async (result) => {
              for (const [symbol, dataProviderResponse] of Object.entries(
                result
              )) {
                dataProviderResponse.dataSource = 'GHOSTFOLIO';

                if (
                  [
                    ...DERIVED_CURRENCIES.map(({ currency }) => {
                      return `${DEFAULT_CURRENCY}${currency}`;
                    }),
                    `${DEFAULT_CURRENCY}USX`
                  ].includes(symbol)
                ) {
                  continue;
                }

                results.quotes[symbol] = dataProviderResponse;

                for (const {
                  currency,
                  factor,
                  rootCurrency
                } of DERIVED_CURRENCIES) {
                  if (symbol === `${DEFAULT_CURRENCY}${rootCurrency}`) {
                    results.quotes[`${DEFAULT_CURRENCY}${currency}`] = {
                      ...dataProviderResponse,
                      currency,
                      marketPrice: new Big(
                        result[`${DEFAULT_CURRENCY}${rootCurrency}`].marketPrice
                      )
                        .mul(factor)
                        .toNumber(),
                      marketState: 'open'
                    };
                  }
                }
              }
            })
          );
        }

        await Promise.all(promises);
      }

      return results;
    } catch (error) {
      Logger.error(error, 'GhostfolioService');

      throw error;
    }
  }

  public async incrementDailyRequests({ userId }: { userId: string }) {
    await this.prismaService.analytics.update({
      data: {
        dataProviderGhostfolioDailyRequests: { increment: 1 },
        lastRequestAt: new Date()
      },
      where: { userId }
    });
  }

  public async lookup({
    includeIndices = false,
    query
  }: GetSearchParams): Promise<LookupResponse> {
    const results: LookupResponse = { items: [] };

    if (!query) {
      return results;
    }

    try {
      let lookupItems: LookupItem[] = [];
      const promises: Promise<{ items: LookupItem[] }>[] = [];

      if (query?.length < 2) {
        return { items: lookupItems };
      }

      for (const dataProviderService of this.getDataProviderServices()) {
        promises.push(
          dataProviderService.search({
            includeIndices,
            query
          })
        );
      }

      const searchResults = await Promise.all(promises);

      for (const { items } of searchResults) {
        if (items?.length > 0) {
          lookupItems = lookupItems.concat(items);
        }
      }

      const filteredItems = lookupItems
        .filter(({ currency }) => {
          // Only allow symbols with supported currency
          return currency ? true : false;
        })
        .sort(({ name: name1 }, { name: name2 }) => {
          return name1?.toLowerCase().localeCompare(name2?.toLowerCase());
        })
        .map((lookupItem) => {
          lookupItem.dataProviderInfo = this.getDataProviderInfo();
          lookupItem.dataSource = 'GHOSTFOLIO';

          return lookupItem;
        });

      results.items = filteredItems;
      return results;
    } catch (error) {
      Logger.error(error, 'GhostfolioService');

      throw error;
    }
  }

  private getDataProviderInfo(): DataProviderInfo {
    return {
      isPremium: false,
      name: 'Ghostfolio Premium',
      url: 'https://ghostfol.io'
    };
  }

  private getDataProviderServices() {
    return this.configurationService
      .get('DATA_SOURCES_GHOSTFOLIO_DATA_PROVIDER')
      .map((dataSource) => {
        return this.dataProviderService.getDataProvider(DataSource[dataSource]);
      });
  }
}
