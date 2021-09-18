import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import {
  IDataGatheringItem,
  IDataProviderHistoricalResponse,
  IDataProviderResponse
} from '@ghostfolio/api/services/interfaces/interfaces';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { DATE_FORMAT } from '@ghostfolio/common/helper';
import { Granularity } from '@ghostfolio/common/types';
import { Injectable } from '@nestjs/common';
import { DataSource, MarketData } from '@prisma/client';
import { format } from 'date-fns';

import { AlphaVantageService } from './alpha-vantage/alpha-vantage.service';
import { GhostfolioScraperApiService } from './ghostfolio-scraper-api/ghostfolio-scraper-api.service';
import { RakutenRapidApiService } from './rakuten-rapid-api/rakuten-rapid-api.service';
import {
  YahooFinanceService,
  convertToYahooFinanceSymbol
} from './yahoo-finance/yahoo-finance.service';

@Injectable()
export class DataProviderService {
  public constructor(
    private readonly alphaVantageService: AlphaVantageService,
    private readonly configurationService: ConfigurationService,
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
      if (item.dataSource === DataSource.ALPHA_VANTAGE) {
        response[item.symbol] = (
          await this.alphaVantageService.get([item.symbol])
        )[item.symbol];
      } else if (item.dataSource === DataSource.GHOSTFOLIO) {
        response[item.symbol] = (
          await this.ghostfolioScraperApiService.get([item.symbol])
        )[item.symbol];
      } else if (item.dataSource === DataSource.RAKUTEN) {
        response[item.symbol] = (
          await this.rakutenRapidApiService.get([item.symbol])
        )[item.symbol];
      } else if (item.dataSource === DataSource.YAHOO) {
        response[item.symbol] = (
          await this.yahooFinanceService.get([
            convertToYahooFinanceSymbol(item.symbol)
          ])
        )[item.symbol];
      }
    }

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
      const queryRaw = `SELECT * FROM "MarketData" WHERE "dataSource" IN ('${dataSources.join(
        `','`
      )}') AND "symbol" IN ('${symbols.join(
        `','`
      )}') ${granularityQuery} ${rangeQuery} ORDER BY date;`;

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
