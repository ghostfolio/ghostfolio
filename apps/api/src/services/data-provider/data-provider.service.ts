import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { DataProviderInterface } from '@ghostfolio/api/services/data-provider/interfaces/data-provider.interface';
import {
  IDataGatheringItem,
  IDataProviderHistoricalResponse,
  IDataProviderResponse
} from '@ghostfolio/api/services/interfaces/interfaces';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { DATE_FORMAT } from '@ghostfolio/common/helper';
import { Granularity } from '@ghostfolio/common/types';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource, MarketData, SymbolProfile } from '@prisma/client';
import { format, isValid } from 'date-fns';
import { groupBy, isEmpty } from 'lodash';

@Injectable()
export class DataProviderService {
  public constructor(
    private readonly configurationService: ConfigurationService,
    @Inject('DataProviderInterfaces')
    private readonly dataProviderInterfaces: DataProviderInterface[],
    private readonly prismaService: PrismaService
  ) {}

  public async getHistorical(
    aItems: IDataGatheringItem[],
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

    const dataSources = aItems.map((item) => {
      return item.dataSource;
    });
    const symbols = aItems.map((item) => {
      return item.symbol;
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
    aDataGatheringItems: IDataGatheringItem[],
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

    const allData = await Promise.all(promises);
    for (const { data, symbol } of allData) {
      result[symbol] = data;
    }

    return result;
  }

  public getPrimaryDataSource(): DataSource {
    return DataSource[this.configurationService.get('DATA_SOURCE_PRIMARY')];
  }

  public async getAssetProfiles(items: IDataGatheringItem[]): Promise<{
    [symbol: string]: Partial<SymbolProfile>;
  }> {
    const response: {
      [symbol: string]: Partial<SymbolProfile>;
    } = {};

    const itemsGroupedByDataSource = groupBy(items, (item) => item.dataSource);

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

  public async getQuotes(items: IDataGatheringItem[]): Promise<{
    [symbol: string]: IDataProviderResponse;
  }> {
    const response: {
      [symbol: string]: IDataProviderResponse;
    } = {};
    const startTimeTotal = performance.now();

    const itemsGroupedByDataSource = groupBy(items, (item) => item.dataSource);

    const promises = [];

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

        const promise = Promise.resolve(dataProvider.getQuotes(symbolsChunk));

        promises.push(
          promise.then((result) => {
            for (const [symbol, dataProviderResponse] of Object.entries(
              result
            )) {
              response[symbol] = dataProviderResponse;
            }

            Logger.debug(
              `Fetched ${symbolsChunk.length} quotes from ${dataSource} in ${(
                (performance.now() - startTimeDataSource) /
                1000
              ).toFixed(3)} seconds`
            );
          })
        );
      }
    }

    await Promise.all(promises);

    Logger.debug('------------------------------------------------');
    Logger.debug(
      `Fetched ${items.length} quotes in ${(
        (performance.now() - startTimeTotal) /
        1000
      ).toFixed(3)} seconds`
    );
    Logger.debug('================================================');

    return response;
  }

  public async search(aQuery: string): Promise<{ items: LookupItem[] }> {
    const promises: Promise<{ items: LookupItem[] }>[] = [];
    let lookupItems: LookupItem[] = [];

    for (const dataSource of this.configurationService.get('DATA_SOURCES')) {
      promises.push(
        this.getDataProvider(DataSource[dataSource]).search(aQuery)
      );
    }

    const searchResults = await Promise.all(promises);

    searchResults.forEach((searchResult) => {
      lookupItems = lookupItems.concat(searchResult.items);
    });

    const filteredItems = lookupItems.filter((lookupItem) => {
      // Only allow symbols with supported currency
      return lookupItem.currency ? true : false;
    });

    return {
      items: filteredItems
    };
  }

  private getDataProvider(providerName: DataSource) {
    for (const dataProviderInterface of this.dataProviderInterfaces) {
      if (dataProviderInterface.getName() === providerName) {
        return dataProviderInterface;
      }
    }

    throw new Error('No data provider has been found.');
  }
}
