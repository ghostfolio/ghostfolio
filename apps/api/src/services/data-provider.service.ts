import {
  DATE_FORMAT,
  isGhostfolioScraperApiSymbol,
  isRakutenRapidApiSymbol
} from '@ghostfolio/common/helper';
import { Granularity } from '@ghostfolio/common/types';
import { Injectable } from '@nestjs/common';
import { DataSource, MarketData } from '@prisma/client';
import { format } from 'date-fns';

import { ConfigurationService } from './configuration.service';
import { AlphaVantageService } from './data-provider/alpha-vantage/alpha-vantage.service';
import { GhostfolioScraperApiService } from './data-provider/ghostfolio-scraper-api/ghostfolio-scraper-api.service';
import { RakutenRapidApiService } from './data-provider/rakuten-rapid-api/rakuten-rapid-api.service';
import { YahooFinanceService } from './data-provider/yahoo-finance/yahoo-finance.service';
import {
  IDataGatheringItem,
  IDataProviderHistoricalResponse,
  IDataProviderResponse
} from './interfaces/interfaces';
import { PrismaService } from './prisma.service';

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

  public async get(
    aSymbols: string[]
  ): Promise<{ [symbol: string]: IDataProviderResponse }> {
    if (aSymbols.length === 1) {
      const symbol = aSymbols[0];

      if (isGhostfolioScraperApiSymbol(symbol)) {
        return this.ghostfolioScraperApiService.get(aSymbols);
      } else if (isRakutenRapidApiSymbol(symbol)) {
        return this.rakutenRapidApiService.get(aSymbols);
      }
    }

    const yahooFinanceSymbols = aSymbols.filter((symbol) => {
      return (
        !isGhostfolioScraperApiSymbol(symbol) &&
        !isRakutenRapidApiSymbol(symbol)
      );
    });

    const response = await this.yahooFinanceService.get(yahooFinanceSymbols);

    const ghostfolioScraperApiSymbols = aSymbols.filter((symbol) => {
      return isGhostfolioScraperApiSymbol(symbol);
    });

    for (const symbol of ghostfolioScraperApiSymbols) {
      if (symbol) {
        const ghostfolioScraperApiResult =
          await this.ghostfolioScraperApiService.get([symbol]);
        response[symbol] = ghostfolioScraperApiResult[symbol];
      }
    }

    const rakutenRapidApiSymbols = aSymbols.filter((symbol) => {
      return isRakutenRapidApiSymbol(symbol);
    });

    for (const symbol of rakutenRapidApiSymbols) {
      if (symbol) {
        const rakutenRapidApiResult =
          await this.ghostfolioScraperApiService.get([symbol]);
        response[symbol] = rakutenRapidApiResult[symbol];
      }
    }

    return response;
  }

  public async getHistorical(
    aSymbols: string[],
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

    try {
      const queryRaw = `SELECT * FROM "MarketData" WHERE "symbol" IN ('${aSymbols.join(
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

  public async search(aSymbol: string) {
    return this.getDataProvider(
      <DataSource>this.configurationService.get('DATA_SOURCES')[0]
    ).search(aSymbol);
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
