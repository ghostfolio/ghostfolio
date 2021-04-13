import { Injectable } from '@nestjs/common';
import { isAfter, isBefore, parse } from 'date-fns';

import { DataProviderInterface } from '../../interfaces/data-provider.interface';
import { Granularity } from '../../interfaces/granularity.type';
import {
  IDataProviderHistoricalResponse,
  IDataProviderResponse
} from '../../interfaces/interfaces';
import { IAlphaVantageHistoricalResponse } from './interfaces/interfaces';

const alphaVantage = require('alphavantage')({
  key: process.env.ALPHA_VANTAGE_API_KEY
});

@Injectable()
export class AlphaVantageService implements DataProviderInterface {
  public constructor() {}

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
      } = await alphaVantage.crypto.daily(
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
          isAfter(from, parse(key, 'yyyy-MM-dd', new Date())) &&
          isBefore(to, parse(key, 'yyyy-MM-dd', new Date()))
        ) {
          response[symbol][key] = {
            marketPrice: parseFloat(timeSeries['4a. close (USD)'])
          };
        }
      }

      return response;
    } catch (error) {
      console.error(error, symbol);

      return {};
    }
  }

  public search(aSymbol: string) {
    return alphaVantage.data.search(aSymbol);
  }
}
