import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { DATE_FORMAT } from '@ghostfolio/common/helper';
import { Granularity } from '@ghostfolio/common/types';
import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from '@prisma/client';
import { isAfter, isBefore, parse } from 'date-fns';

import {
  IDataProviderHistoricalResponse,
  IDataProviderResponse
} from '../../interfaces/interfaces';
import { DataProviderInterface } from '../interfaces/data-provider.interface';
import { IAlphaVantageHistoricalResponse } from './interfaces/interfaces';

@Injectable()
export class AlphaVantageService implements DataProviderInterface {
  public alphaVantage;

  public constructor(
    private readonly configurationService: ConfigurationService
  ) {
    this.alphaVantage = require('alphavantage')({
      key: this.configurationService.get('ALPHA_VANTAGE_API_KEY')
    });
  }

  public canHandle(symbol: string) {
    return !!this.configurationService.get('ALPHA_VANTAGE_API_KEY');
  }

  public async get(
    aSymbols: string[]
  ): Promise<{ [symbol: string]: IDataProviderResponse }> {
    return {};
  }

  public async getHistorical(
    aSymbols: string[],
    aGranularity: Granularity = 'day',
    from: Date,
    to: Date
  ): Promise<{
    [symbol: string]: { [date: string]: IDataProviderHistoricalResponse };
  }> {
    if (aSymbols.length <= 0) {
      return {};
    }

    const symbol = aSymbols[0];

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
      Logger.error(error, symbol);

      return {};
    }
  }

  public getName(): DataSource {
    return DataSource.ALPHA_VANTAGE;
  }

  public async search(aQuery: string): Promise<{ items: LookupItem[] }> {
    const result = await this.alphaVantage.data.search(aQuery);

    return {
      items: result?.bestMatches?.map((bestMatch) => {
        return {
          dataSource: this.getName(),
          name: bestMatch['2. name'],
          symbol: bestMatch['1. symbol']
        };
      })
    };
  }
}
