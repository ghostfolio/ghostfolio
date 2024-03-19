import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import {
  DataProviderInterface,
  GetDividendsParams,
  GetHistoricalParams,
  GetQuotesParams,
  GetSearchParams
} from '@ghostfolio/api/services/data-provider/interfaces/data-provider.interface';
import {
  IDataProviderHistoricalResponse,
  IDataProviderResponse
} from '@ghostfolio/api/services/interfaces/interfaces';
import { DATE_FORMAT } from '@ghostfolio/common/helper';
import { DataProviderInfo } from '@ghostfolio/common/interfaces';

import { Injectable } from '@nestjs/common';
import { DataSource, SymbolProfile } from '@prisma/client';
import * as Alphavantage from 'alphavantage';
import { format, isAfter, isBefore, parse } from 'date-fns';

import { IAlphaVantageHistoricalResponse } from './interfaces/interfaces';

@Injectable()
export class AlphaVantageService implements DataProviderInterface {
  public alphaVantage;

  public constructor(
    private readonly configurationService: ConfigurationService
  ) {
    this.alphaVantage = Alphavantage({
      key: this.configurationService.get('API_KEY_ALPHA_VANTAGE')
    });
  }

  public canHandle(symbol: string) {
    return !!this.configurationService.get('API_KEY_ALPHA_VANTAGE');
  }

  public async getAssetProfile({
    symbol
  }: {
    symbol: string;
  }): Promise<Partial<SymbolProfile>> {
    return {
      symbol,
      dataSource: this.getName()
    };
  }

  public getDataProviderInfo(): DataProviderInfo {
    return {
      isPremium: false
    };
  }

  public async getDividends({}: GetDividendsParams) {
    return {};
  }

  public async getHistorical({
    from,
    symbol,
    to
  }: GetHistoricalParams): Promise<{
    [symbol: string]: { [date: string]: IDataProviderHistoricalResponse };
  }> {
    try {
      const historicalData: {
        [symbol: string]: IAlphaVantageHistoricalResponse[];
      } = await this.alphaVantage.crypto.daily(
        symbol.substring(0, symbol.length - 3).toLowerCase(),
        'usd'
      );

      const response: {
        [symbol: string]: { [date: string]: IDataProviderHistoricalResponse };
      } = {};

      response[symbol] = {};

      for (const [key, timeSeries] of Object.entries(
        historicalData['Time Series (Digital Currency Daily)']
      ).sort()) {
        if (
          isAfter(from, parse(key, DATE_FORMAT, new Date())) &&
          isBefore(to, parse(key, DATE_FORMAT, new Date()))
        ) {
          response[symbol][key] = {
            marketPrice: parseFloat(timeSeries['4a. close (USD)'])
          };
        }
      }

      return response;
    } catch (error) {
      throw new Error(
        `Could not get historical market data for ${symbol} (${this.getName()}) from ${format(
          from,
          DATE_FORMAT
        )} to ${format(to, DATE_FORMAT)}: [${error.name}] ${error.message}`
      );
    }
  }

  public getName(): DataSource {
    return DataSource.ALPHA_VANTAGE;
  }

  public async getQuotes({}: GetQuotesParams): Promise<{
    [symbol: string]: IDataProviderResponse;
  }> {
    return {};
  }

  public getTestSymbol() {
    return undefined;
  }

  public async search({
    query
  }: GetSearchParams): Promise<{ items: LookupItem[] }> {
    const result = await this.alphaVantage.data.search(query);

    return {
      items: result?.bestMatches?.map((bestMatch) => {
        return {
          assetClass: undefined,
          assetSubClass: undefined,
          currency: bestMatch['8. currency'],
          dataProviderInfo: this.getDataProviderInfo(),
          dataSource: this.getName(),
          name: bestMatch['2. name'],
          symbol: bestMatch['1. symbol']
        };
      })
    };
  }
}
