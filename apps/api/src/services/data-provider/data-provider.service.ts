import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { DataProviderInterface } from '@ghostfolio/api/services/data-provider/interfaces/data-provider.interface';
import {
  IDataProviderHistoricalResponse,
  IDataProviderResponse
} from '@ghostfolio/api/services/interfaces/interfaces';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import { PROPERTY_DATA_SOURCE_MAPPING } from '@ghostfolio/common/config';
import { DATE_FORMAT, getStartOfUtcDate } from '@ghostfolio/common/helper';
import { UniqueAsset } from '@ghostfolio/common/interfaces';
import type { Granularity, UserWithSettings } from '@ghostfolio/common/types';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource, MarketData, SymbolProfile } from '@prisma/client';
import { format, isValid } from 'date-fns';
import { groupBy, isEmpty, isNumber } from 'lodash';
import ms from 'ms';

@Injectable()
export class DataProviderService {
  private dataProviderMapping: { [dataProviderName: string]: string };

  public constructor(
    private readonly configurationService: ConfigurationService,
    @Inject('DataProviderInterfaces')
    private readonly dataProviderInterfaces: DataProviderInterface[],
    private readonly marketDataService: MarketDataService,
    private readonly prismaService: PrismaService,
    private readonly propertyService: PropertyService,
    private readonly redisCacheService: RedisCacheService
  ) {
    this.initialize();
  }

  public async initialize() {
    this.dataProviderMapping =
      ((await this.propertyService.getByKey(PROPERTY_DATA_SOURCE_MAPPING)) as {
        [dataProviderName: string]: string;
      }) ?? {};
  }

  public async checkQuote(dataSource: DataSource) {
    const dataProvider = this.getDataProvider(dataSource);
    const symbol = dataProvider.getTestSymbol();

    const quotes = await this.getQuotes({
      items: [
        {
          dataSource,
          symbol
        }
      ],
      requestTimeout: ms('30 seconds'),
      useCache: false
    });

    if (quotes[symbol]?.marketPrice > 0) {
      return true;
    }

    return false;
  }

  public async getAssetProfiles(items: UniqueAsset[]): Promise<{
    [symbol: string]: Partial<SymbolProfile>;
  }> {
    const response: {
      [symbol: string]: Partial<SymbolProfile>;
    } = {};

    const itemsGroupedByDataSource = groupBy(items, ({ dataSource }) => {
      return dataSource;
    });

    const promises = [];

    for (const [dataSource, dataGatheringItems] of Object.entries(
      itemsGroupedByDataSource
    )) {
      const symbols = dataGatheringItems.map((dataGatheringItem) => {
        return dataGatheringItem.symbol;
      });

      for (const symbol of symbols) {
        const promise = Promise.resolve(
          this.getDataProvider(DataSource[dataSource]).getAssetProfile(symbol)
        );

        promises.push(
          promise.then((symbolProfile) => {
            response[symbol] = symbolProfile;
          })
        );
      }
    }

    await Promise.all(promises);

    return response;
  }

  public getDataSourceForExchangeRates(): DataSource {
    return DataSource[
      this.configurationService.get('DATA_SOURCE_EXCHANGE_RATES')
    ];
  }

  public getDataSourceForImport(): DataSource {
    return DataSource[this.configurationService.get('DATA_SOURCE_IMPORT')];
  }

  public async getDividends({
    dataSource,
    from,
    granularity = 'day',
    symbol,
    to
  }: {
    dataSource: DataSource;
    from: Date;
    granularity: Granularity;
    symbol: string;
    to: Date;
  }) {
    return this.getDataProvider(DataSource[dataSource]).getDividends({
      from,
      granularity,
      symbol,
      to
    });
  }

  public async getHistorical(
    aItems: UniqueAsset[],
    aGranularity: Granularity = 'month',
    from: Date,
    to: Date
  ): Promise<{
    [symbol: string]: { [date: string]: IDataProviderHistoricalResponse };
  }> {
    let response: {
      [symbol: string]: { [date: string]: IDataProviderHistoricalResponse };
    } = {};

    if (isEmpty(aItems) || !isValid(from) || !isValid(to)) {
      return response;
    }

    const granularityQuery =
      aGranularity === 'month'
        ? `AND (date_part('day', date) = 1 OR date >= TIMESTAMP 'yesterday')`
        : '';

    const rangeQuery =
      from && to
        ? `AND date >= '${format(from, DATE_FORMAT)}' AND date <= '${format(
            to,
            DATE_FORMAT
          )}'`
        : '';

    const dataSources = aItems.map(({ dataSource }) => {
      return dataSource;
    });
    const symbols = aItems.map(({ symbol }) => {
      return symbol;
    });

    try {
      const queryRaw = `SELECT *
                        FROM "MarketData"
                        WHERE "dataSource" IN ('${dataSources.join(`','`)}')
                          AND "symbol" IN ('${symbols.join(
                            `','`
                          )}') ${granularityQuery} ${rangeQuery}
                        ORDER BY date;`;

      const marketDataByGranularity: MarketData[] =
        await this.prismaService.$queryRawUnsafe(queryRaw);

      response = marketDataByGranularity.reduce((r, marketData) => {
        const { date, marketPrice, symbol } = marketData;

        r[symbol] = {
          ...(r[symbol] || {}),
          [format(new Date(date), DATE_FORMAT)]: { marketPrice }
        };

        return r;
      }, {});
    } catch (error) {
      Logger.error(error, 'DataProviderService');
    } finally {
      return response;
    }
  }

  public async getHistoricalRaw(
    aDataGatheringItems: UniqueAsset[],
    from: Date,
    to: Date
  ): Promise<{
    [symbol: string]: { [date: string]: IDataProviderHistoricalResponse };
  }> {
    const result: {
      [symbol: string]: { [date: string]: IDataProviderHistoricalResponse };
    } = {};

    const promises: Promise<{
      data: { [date: string]: IDataProviderHistoricalResponse };
      symbol: string;
    }>[] = [];
    for (const { dataSource, symbol } of aDataGatheringItems) {
      const dataProvider = this.getDataProvider(dataSource);
      if (dataProvider.canHandle(symbol)) {
        promises.push(
          dataProvider
            .getHistorical(symbol, undefined, from, to)
            .then((data) => ({ data: data?.[symbol], symbol }))
        );
      }
    }

    try {
      const allData = await Promise.all(promises);
      for (const { data, symbol } of allData) {
        result[symbol] = data;
      }
    } catch (error) {
      Logger.error(error, 'DataProviderService');
    }

    return result;
  }

  public async getQuotes({
    items,
    requestTimeout,
    useCache = true
  }: {
    items: UniqueAsset[];
    requestTimeout?: number;
    useCache?: boolean;
  }): Promise<{
    [symbol: string]: IDataProviderResponse;
  }> {
    const response: {
      [symbol: string]: IDataProviderResponse;
    } = {};
    const startTimeTotal = performance.now();

    // Get items from cache
    const itemsToFetch: UniqueAsset[] = [];

    for (const { dataSource, symbol } of items) {
      if (useCache) {
        const quoteString = await this.redisCacheService.get(
          this.redisCacheService.getQuoteKey({ dataSource, symbol })
        );

        if (quoteString) {
          try {
            const cachedDataProviderResponse = JSON.parse(quoteString);
            response[symbol] = cachedDataProviderResponse;
            continue;
          } catch {}
        }
      }

      itemsToFetch.push({ dataSource, symbol });
    }

    const numberOfItemsInCache = Object.keys(response)?.length;

    if (numberOfItemsInCache) {
      Logger.debug(
        `Fetched ${numberOfItemsInCache} quote${
          numberOfItemsInCache > 1 ? 's' : ''
        } from cache in ${((performance.now() - startTimeTotal) / 1000).toFixed(
          3
        )} seconds`
      );
    }

    const itemsGroupedByDataSource = groupBy(itemsToFetch, ({ dataSource }) => {
      return dataSource;
    });

    const promises: Promise<any>[] = [];

    for (const [dataSource, dataGatheringItems] of Object.entries(
      itemsGroupedByDataSource
    )) {
      const dataProvider = this.getDataProvider(DataSource[dataSource]);

      const symbols = dataGatheringItems.map((dataGatheringItem) => {
        return dataGatheringItem.symbol;
      });

      const maximumNumberOfSymbolsPerRequest =
        dataProvider.getMaxNumberOfSymbolsPerRequest?.() ??
        Number.MAX_SAFE_INTEGER;
      for (
        let i = 0;
        i < symbols.length;
        i += maximumNumberOfSymbolsPerRequest
      ) {
        const startTimeDataSource = performance.now();

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
              response[symbol] = dataProviderResponse;

              this.redisCacheService.set(
                this.redisCacheService.getQuoteKey({
                  dataSource: DataSource[dataSource],
                  symbol
                }),
                JSON.stringify(dataProviderResponse),
                this.configurationService.get('CACHE_QUOTES_TTL')
              );
            }

            Logger.debug(
              `Fetched ${symbolsChunk.length} quote${
                symbolsChunk.length > 1 ? 's' : ''
              } from ${dataSource} in ${(
                (performance.now() - startTimeDataSource) /
                1000
              ).toFixed(3)} seconds`
            );

            try {
              await this.marketDataService.updateMany({
                data: Object.keys(response)
                  .filter((symbol) => {
                    return (
                      isNumber(response[symbol].marketPrice) &&
                      response[symbol].marketPrice > 0
                    );
                  })
                  .map((symbol) => {
                    return {
                      symbol,
                      dataSource: response[symbol].dataSource,
                      date: getStartOfUtcDate(new Date()),
                      marketPrice: response[symbol].marketPrice,
                      state: 'INTRADAY'
                    };
                  })
              });
            } catch {}
          })
        );
      }
    }

    await Promise.all(promises);

    Logger.debug('------------------------------------------------');
    Logger.debug(
      `Fetched ${items.length} quote${items.length > 1 ? 's' : ''} in ${(
        (performance.now() - startTimeTotal) /
        1000
      ).toFixed(3)} seconds`
    );
    Logger.debug('================================================');

    return response;
  }

  public async search({
    includeIndices = false,
    query,
    user
  }: {
    includeIndices?: boolean;
    query: string;
    user: UserWithSettings;
  }): Promise<{ items: LookupItem[] }> {
    const promises: Promise<{ items: LookupItem[] }>[] = [];
    let lookupItems: LookupItem[] = [];

    if (query?.length < 2) {
      return { items: lookupItems };
    }

    let dataSources = this.configurationService.get('DATA_SOURCES');

    if (
      this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION') &&
      user.subscription.type === 'Basic'
    ) {
      dataSources = dataSources.filter((dataSource) => {
        return !this.isPremiumDataSource(DataSource[dataSource]);
      });
    }

    for (const dataSource of dataSources) {
      promises.push(
        this.getDataProvider(DataSource[dataSource]).search({
          includeIndices,
          query
        })
      );
    }

    const searchResults = await Promise.all(promises);

    searchResults.forEach(({ items }) => {
      if (items?.length > 0) {
        lookupItems = lookupItems.concat(items);
      }
    });

    const filteredItems = lookupItems
      .filter((lookupItem) => {
        // Only allow symbols with supported currency
        return lookupItem.currency ? true : false;
      })
      .sort(({ name: name1 }, { name: name2 }) => {
        return name1?.toLowerCase().localeCompare(name2?.toLowerCase());
      });

    return {
      items: filteredItems
    };
  }

  private getDataProvider(providerName: DataSource) {
    for (const dataProviderInterface of this.dataProviderInterfaces) {
      if (this.dataProviderMapping[dataProviderInterface.getName()]) {
        const mappedDataProviderInterface = this.dataProviderInterfaces.find(
          (currentDataProviderInterface) => {
            return (
              currentDataProviderInterface.getName() ===
              this.dataProviderMapping[dataProviderInterface.getName()]
            );
          }
        );

        if (mappedDataProviderInterface) {
          return mappedDataProviderInterface;
        }
      }

      if (dataProviderInterface.getName() === providerName) {
        return dataProviderInterface;
      }
    }

    throw new Error('No data provider has been found.');
  }

  private isPremiumDataSource(aDataSource: DataSource) {
    const premiumDataSources: DataSource[] = [
      DataSource.EOD_HISTORICAL_DATA,
      DataSource.FINANCIAL_MODELING_PREP
    ];
    return premiumDataSources.includes(aDataSource);
  }
}
