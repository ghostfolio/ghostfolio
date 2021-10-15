import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { DataEnhancerInterface } from '@ghostfolio/api/services/data-provider/interfaces/data-enhancer.interface';
import {
  IDataGatheringItem,
  IDataProviderHistoricalResponse,
  IDataProviderResponse
} from '@ghostfolio/api/services/interfaces/interfaces';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { DATE_FORMAT } from '@ghostfolio/common/helper';
import { Granularity } from '@ghostfolio/common/types';
import { Inject, Injectable } from '@nestjs/common';
import { DataSource, MarketData } from '@prisma/client';
import { format } from 'date-fns';
import { isEmpty } from 'lodash';

import { AlphaVantageService } from './alpha-vantage/alpha-vantage.service';
import { GhostfolioScraperApiService } from './ghostfolio-scraper-api/ghostfolio-scraper-api.service';
import { RakutenRapidApiService } from './rakuten-rapid-api/rakuten-rapid-api.service';
import { YahooFinanceService } from './yahoo-finance/yahoo-finance.service';

@Injectable()
export class DataProviderService {
  public constructor(
    private readonly alphaVantageService: AlphaVantageService,
    private readonly configurationService: ConfigurationService,
    @Inject('DataEnhancers')
    private readonly dataEnhancers: DataEnhancerInterface[],
    private readonly ghostfolioScraperApiService: GhostfolioScraperApiService,
    private readonly prismaService: PrismaService,
    private readonly rakutenRapidApiService: RakutenRapidApiService,
    private readonly yahooFinanceService: YahooFinanceService
  ) {
    this.rakutenRapidApiService?.setPrisma(this.prismaService);
  }

  public async get(items: IDataGatheringItem[]): Promise<{
    [symbol: string]: IDataProviderResponse;
  }> {
    const response: {
      [symbol: string]: IDataProviderResponse;
    } = {};

    for (const item of items) {
      const dataProvider = this.getDataProvider(item.dataSource);
      response[item.symbol] = (await dataProvider.get([item.symbol]))[
        item.symbol
      ];
    }

    const promises = [];
    for (const symbol of Object.keys(response)) {
      let promise = Promise.resolve(response[symbol]);
      for (const dataEnhancer of this.dataEnhancers) {
        promise = promise.then((currentResponse) =>
          dataEnhancer
            .enhance({ symbol, response: currentResponse })
            .catch((error) => {
              console.error(
                `Failed to enhance data for symbol ${symbol}`,
                error
              );
              return currentResponse;
            })
        );
      }
      promises.push(
        promise.then((currentResponse) => (response[symbol] = currentResponse))
      );
    }

    await Promise.all(promises);

    return response;
  }

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

    if (isEmpty(aItems)) {
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
        await this.prismaService.$queryRaw(queryRaw);

      response = marketDataByGranularity.reduce((r, marketData) => {
        const { date, marketPrice, symbol } = marketData;

        r[symbol] = {
          ...(r[symbol] || {}),
          [format(new Date(date), DATE_FORMAT)]: { marketPrice }
        };

        return r;
      }, {});
    } catch (error) {
      console.error(error);
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
            .getHistorical([symbol], undefined, from, to)
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

  public async search(aSymbol: string): Promise<{ items: LookupItem[] }> {
    const promises: Promise<{ items: LookupItem[] }>[] = [];
    let lookupItems: LookupItem[] = [];

    for (const dataSource of this.configurationService.get('DATA_SOURCES')) {
      promises.push(
        this.getDataProvider(DataSource[dataSource]).search(aSymbol)
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

  public getPrimaryDataSource(): DataSource {
    return DataSource[this.configurationService.get('DATA_SOURCES')[0]];
  }

  private getDataProvider(providerName: DataSource) {
    switch (providerName) {
      case DataSource.ALPHA_VANTAGE:
        return this.alphaVantageService;
      case DataSource.GHOSTFOLIO:
        return this.ghostfolioScraperApiService;
      case DataSource.RAKUTEN:
        return this.rakutenRapidApiService;
      case DataSource.YAHOO:
        return this.yahooFinanceService;
      default:
        throw new Error('No data provider has been found.');
    }
  }
}
