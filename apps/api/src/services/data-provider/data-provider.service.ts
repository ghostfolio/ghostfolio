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
import {
  DEFAULT_CURRENCY,
  DERIVED_CURRENCIES,
  PROPERTY_DATA_SOURCE_MAPPING
} from '@ghostfolio/common/config';
import { DATE_FORMAT, getStartOfUtcDate } from '@ghostfolio/common/helper';
import { UniqueAsset } from '@ghostfolio/common/interfaces';
import type { Granularity, UserWithSettings } from '@ghostfolio/common/types';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource, MarketData, SymbolProfile } from '@prisma/client';
import { Big } from 'big.js';
import { eachDayOfInterval, format, isValid } from 'date-fns';
import { groupBy, isEmpty, isNumber, uniqWith } from 'lodash';
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
          this.getDataProvider(DataSource[dataSource]).getAssetProfile({
            symbol
          })
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

  public getDataProvider(providerName: DataSource) {
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
      to,
      requestTimeout: ms('30 seconds')
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
      const queryRaw = `
        SELECT *
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
    let dataGatheringItems = aDataGatheringItems;

    for (const { currency, rootCurrency } of DERIVED_CURRENCIES) {
      if (
        this.hasCurrency({
          dataGatheringItems,
          currency: `${DEFAULT_CURRENCY}${currency}`
        })
      ) {
        // Skip derived currency
        dataGatheringItems = dataGatheringItems.filter(({ symbol }) => {
          return symbol !== `${DEFAULT_CURRENCY}${currency}`;
        });
        // Add root currency
        dataGatheringItems.push({
          dataSource: this.getDataSourceForExchangeRates(),
          symbol: `${DEFAULT_CURRENCY}${rootCurrency}`
        });
      }
    }

    dataGatheringItems = uniqWith(dataGatheringItems, (obj1, obj2) => {
      return obj1.dataSource === obj2.dataSource && obj1.symbol === obj2.symbol;
    });

    const result: {
      [symbol: string]: { [date: string]: IDataProviderHistoricalResponse };
    } = {};

    const promises: Promise<{
      data: { [date: string]: IDataProviderHistoricalResponse };
      symbol: string;
    }>[] = [];
    for (const { dataSource, symbol } of dataGatheringItems) {
      const dataProvider = this.getDataProvider(dataSource);
      if (dataProvider.canHandle(symbol)) {
        if (symbol === `${DEFAULT_CURRENCY}USX`) {
          const data: {
            [date: string]: IDataProviderHistoricalResponse;
          } = {};

          for (const date of eachDayOfInterval({ end: to, start: from })) {
            data[format(date, DATE_FORMAT)] = { marketPrice: 100 };
          }

          promises.push(
            Promise.resolve({
              data,
              symbol
            })
          );
        } else {
          promises.push(
            dataProvider
              .getHistorical({
                from,
                symbol,
                to,
                requestTimeout: ms('30 seconds')
              })
              .then((data) => {
                return { symbol, data: data?.[symbol] };
              })
          );
        }
      }
    }

    try {
      const allData = await Promise.all(promises);

      for (const { data, symbol } of allData) {
        const currency = DERIVED_CURRENCIES.find(({ rootCurrency }) => {
          return `${DEFAULT_CURRENCY}${rootCurrency}` === symbol;
        });

        if (currency) {
          // Add derived currency
          result[`${DEFAULT_CURRENCY}${currency.currency}`] =
            this.transformHistoricalData({
              allData,
              currency: `${DEFAULT_CURRENCY}${currency.rootCurrency}`,
              factor: currency.factor
            });
        }

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
    useCache = true,
    user
  }: {
    items: UniqueAsset[];
    requestTimeout?: number;
    useCache?: boolean;
    user?: UserWithSettings;
  }): Promise<{
    [symbol: string]: IDataProviderResponse;
  }> {
    const response: {
      [symbol: string]: IDataProviderResponse;
    } = {};
    const startTimeTotal = performance.now();

    if (
      items.some(({ symbol }) => {
        return symbol === `${DEFAULT_CURRENCY}USX`;
      })
    ) {
      response[`${DEFAULT_CURRENCY}USX`] = {
        currency: 'USX',
        dataSource: this.getDataSourceForExchangeRates(),
        marketPrice: 100,
        marketState: 'open'
      };
    }

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

      if (
        dataProvider.getDataProviderInfo().isPremium &&
        this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION') &&
        user?.subscription.type === 'Basic'
      ) {
        continue;
      }

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
            for (let [symbol, dataProviderResponse] of Object.entries(result)) {
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

              response[symbol] = dataProviderResponse;

              this.redisCacheService.set(
                this.redisCacheService.getQuoteKey({
                  symbol,
                  dataSource: DataSource[dataSource]
                }),
                JSON.stringify(response[symbol]),
                this.configurationService.get('CACHE_QUOTES_TTL')
              );

              for (const {
                currency,
                factor,
                rootCurrency
              } of DERIVED_CURRENCIES) {
                if (symbol === `${DEFAULT_CURRENCY}${rootCurrency}`) {
                  response[`${DEFAULT_CURRENCY}${currency}`] = {
                    ...dataProviderResponse,
                    currency,
                    marketPrice: new Big(
                      result[`${DEFAULT_CURRENCY}${rootCurrency}`].marketPrice
                    )
                      .mul(factor)
                      .toNumber(),
                    marketState: 'open'
                  };

                  this.redisCacheService.set(
                    this.redisCacheService.getQuoteKey({
                      dataSource: DataSource[dataSource],
                      symbol: `${DEFAULT_CURRENCY}${currency}`
                    }),
                    JSON.stringify(response[`${DEFAULT_CURRENCY}${currency}`]),
                    this.configurationService.get('CACHE_QUOTES_TTL')
                  );
                }
              }
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

    let dataProviderServices = this.configurationService
      .get('DATA_SOURCES')
      .map((dataSource) => {
        return this.getDataProvider(DataSource[dataSource]);
      });

    for (const dataProviderService of dataProviderServices) {
      promises.push(
        dataProviderService.search({
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
      })
      .map((lookupItem) => {
        if (
          !this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION') ||
          user.subscription.type === 'Premium'
        ) {
          lookupItem.dataProviderInfo.isPremium = false;
        }

        return lookupItem;
      });

    return {
      items: filteredItems
    };
  }

  private hasCurrency({
    currency,
    dataGatheringItems
  }: {
    currency: string;
    dataGatheringItems: UniqueAsset[];
  }) {
    return dataGatheringItems.some(({ dataSource, symbol }) => {
      return (
        dataSource === this.getDataSourceForExchangeRates() &&
        symbol === currency
      );
    });
  }

  private transformHistoricalData({
    allData,
    currency,
    factor
  }: {
    allData: {
      data: {
        [date: string]: IDataProviderHistoricalResponse;
      };
      symbol: string;
    }[];
    currency: string;
    factor: number;
  }) {
    const rootData = allData.find(({ symbol }) => {
      return symbol === currency;
    })?.data;

    const data: {
      [date: string]: IDataProviderHistoricalResponse;
    } = {};

    for (const date in rootData) {
      data[date] = {
        marketPrice: new Big(factor).mul(rootData[date].marketPrice).toNumber()
      };
    }

    return data;
  }
}
