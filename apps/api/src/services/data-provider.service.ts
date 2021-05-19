import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import {
  isCrypto,
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
import { DataProviderInterface } from './interfaces/data-provider.interface';
import {
  IDataGatheringItem,
  IDataProviderHistoricalResponse,
  IDataProviderResponse
} from './interfaces/interfaces';
import { PrismaService } from './prisma.service';

@Injectable()
export class DataProviderService implements DataProviderInterface {
  public constructor(
    private readonly alphaVantageService: AlphaVantageService,
    private readonly configurationService: ConfigurationService,
    private readonly ghostfolioScraperApiService: GhostfolioScraperApiService,
    private prisma: PrismaService,
    private readonly rakutenRapidApiService: RakutenRapidApiService,
    private readonly yahooFinanceService: YahooFinanceService
  ) {
    this.rakutenRapidApiService.setPrisma(this.prisma);
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
      return !isGhostfolioScraperApiSymbol(symbol);
    });

    const response = await this.yahooFinanceService.get(yahooFinanceSymbols);

    const ghostfolioScraperApiSymbols = aSymbols.filter((symbol) => {
      return isGhostfolioScraperApiSymbol(symbol);
    });

    for (const symbol of ghostfolioScraperApiSymbols) {
      if (symbol) {
        const ghostfolioScraperApiResult = await this.ghostfolioScraperApiService.get(
          [symbol]
        );
        response[symbol] = ghostfolioScraperApiResult[symbol];
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
        ? `AND date >= '${format(from, 'yyyy-MM-dd')}' AND date <= '${format(
            to,
            'yyyy-MM-dd'
          )}'`
        : '';

    try {
      const queryRaw = `SELECT * FROM "MarketData" WHERE "symbol" IN ('${aSymbols.join(
        `','`
      )}') ${granularityQuery} ${rangeQuery} ORDER BY date;`;

      const marketDataByGranularity: MarketData[] = await this.prisma.$queryRaw(
        queryRaw
      );

      response = marketDataByGranularity.reduce((r, marketData) => {
        const { date, marketPrice, symbol } = marketData;

        r[symbol] = {
          ...(r[symbol] || {}),
          [format(new Date(date), 'yyyy-MM-dd')]: { marketPrice }
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

    for (const { dataSource, symbol } of aDataGatheringItems) {
      switch (dataSource) {
        case DataSource.ALPHA_VANTAGE: {
          if (this.configurationService.get('ALPHA_VANTAGE_API_KEY')) {
            const data = await this.alphaVantageService.getHistorical(
              [symbol],
              undefined,
              from,
              to
            );
            result[symbol] = data?.[symbol];
          }
          break;
        }
        case DataSource.GHOSTFOLIO: {
          if (isGhostfolioScraperApiSymbol(symbol)) {
            const data = await this.ghostfolioScraperApiService.getHistorical(
              [symbol],
              undefined,
              from,
              to
            );
            result[symbol] = data?.[symbol];
          }
          break;
        }
        case DataSource.RAKUTEN: {
          if (
            isRakutenRapidApiSymbol(symbol) &&
            this.configurationService.get('RAKUTEN_RAPID_API_KEY')
          ) {
            const data = await this.rakutenRapidApiService.getHistorical(
              [symbol],
              undefined,
              from,
              to
            );
            result[symbol] = data?.[symbol];
          }
          break;
        }
        case DataSource.YAHOO: {
          const data = await this.yahooFinanceService.getHistorical(
            [symbol],
            undefined,
            from,
            to
          );
          result[symbol] = data?.[symbol];
          break;
        }
      }
    }

    return result;
  }

  public async search(aSymbol: string) {
    return this.getDataProvider().search(aSymbol);
  }

  private getDataProvider() {
    switch (this.configurationService.get('DATA_SOURCES')[0]) {
      case DataSource.ALPHA_VANTAGE:
        return this.alphaVantageService;
      case DataSource.YAHOO:
        return this.yahooFinanceService;
      default:
        throw new Error('No data provider has been found.');
    }
  }
}
