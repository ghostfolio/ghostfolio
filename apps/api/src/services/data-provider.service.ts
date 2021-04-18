import { isCrypto, isRakutenRapidApi } from '@ghostfolio/helper';
import { Injectable } from '@nestjs/common';
import { MarketData } from '@prisma/client';
import { format } from 'date-fns';

import { ConfigurationService } from './configuration.service';
import { AlphaVantageService } from './data-provider/alpha-vantage/alpha-vantage.service';
import { RakutenRapidApiService } from './data-provider/rakuten-rapid-api/rakuten-rapid-api.service';
import { YahooFinanceService } from './data-provider/yahoo-finance/yahoo-finance.service';
import { DataProviderInterface } from './interfaces/data-provider.interface';
import { Granularity } from './interfaces/granularity.type';
import {
  IDataProviderHistoricalResponse,
  IDataProviderResponse
} from './interfaces/interfaces';
import { PrismaService } from './prisma.service';

@Injectable()
export class DataProviderService implements DataProviderInterface {
  public constructor(
    private readonly alphaVantageService: AlphaVantageService,
    private readonly configurationService: ConfigurationService,
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

      if (isRakutenRapidApi(symbol)) {
        return this.rakutenRapidApiService.get(aSymbols);
      }
    }

    return this.yahooFinanceService.get(aSymbols);
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

    let granularityQuery =
      aGranularity === 'month'
        ? `AND (date_part('day', date) = 1 OR date >= TIMESTAMP 'yesterday')`
        : '';

    let rangeQuery =
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
    aSymbols: string[],
    from: Date,
    to: Date
  ): Promise<{
    [symbol: string]: { [date: string]: IDataProviderHistoricalResponse };
  }> {
    const dataOfYahoo = await this.yahooFinanceService.getHistorical(
      aSymbols,
      undefined,
      from,
      to
    );

    if (aSymbols.length === 1) {
      const symbol = aSymbols[0];

      if (
        isCrypto(symbol) &&
        this.configurationService.get('ALPHA_VANTAGE_API_KEY')
      ) {
        // Merge data from Yahoo with data from Alpha Vantage
        const dataOfAlphaVantage = await this.alphaVantageService.getHistorical(
          [symbol],
          undefined,
          from,
          to
        );

        return {
          [symbol]: {
            ...dataOfYahoo[symbol],
            ...dataOfAlphaVantage[symbol]
          }
        };
      } else if (
        isRakutenRapidApi(symbol) &&
        this.configurationService.get('RAKUTEN_RAPID_API_KEY')
      ) {
        const dataOfRakutenRapidApi = await this.rakutenRapidApiService.getHistorical(
          [symbol],
          undefined,
          from,
          to
        );

        return dataOfRakutenRapidApi;
      }
    }

    return dataOfYahoo;
  }
}
