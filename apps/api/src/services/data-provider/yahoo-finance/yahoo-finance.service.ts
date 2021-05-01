import { isCrypto, isCurrency, parseCurrency } from '@ghostfolio/helper';
import { Injectable } from '@nestjs/common';
import { DataSource } from '@prisma/client';
import { format } from 'date-fns';
import * as yahooFinance from 'yahoo-finance';

import { DataProviderInterface } from '../../interfaces/data-provider.interface';
import { Granularity } from '../../interfaces/granularity.type';
import {
  IDataProviderHistoricalResponse,
  IDataProviderResponse,
  Industry,
  MarketState,
  Sector,
  Type
} from '../../interfaces/interfaces';
import {
  IYahooFinanceHistoricalResponse,
  IYahooFinanceQuoteResponse
} from './interfaces/interfaces';

@Injectable()
export class YahooFinanceService implements DataProviderInterface {
  public constructor() {}

  public async get(
    aSymbols: string[]
  ): Promise<{ [symbol: string]: IDataProviderResponse }> {
    if (aSymbols.length <= 0) {
      return {};
    }

    const yahooSymbols = aSymbols.map((symbol) => {
      return this.convertToYahooSymbol(symbol);
    });

    try {
      const response: { [symbol: string]: IDataProviderResponse } = {};

      const data: {
        [symbol: string]: IYahooFinanceQuoteResponse;
      } = await yahooFinance.quote({
        modules: ['price', 'summaryProfile'],
        symbols: yahooSymbols
      });

      for (const [yahooSymbol, value] of Object.entries(data)) {
        // Convert symbols back
        const symbol = convertFromYahooSymbol(yahooSymbol);

        response[symbol] = {
          currency: parseCurrency(value.price?.currency),
          dataSource: DataSource.YAHOO,
          exchange: this.parseExchange(value.price?.exchangeName),
          marketState:
            value.price?.marketState === 'REGULAR' || isCrypto(symbol)
              ? MarketState.open
              : MarketState.closed,
          marketPrice: value.price?.regularMarketPrice || 0,
          name: value.price?.longName || value.price?.shortName || symbol,
          type: this.parseType(this.getType(symbol, value))
        };

        const industry = this.parseIndustry(value.summaryProfile?.industry);
        if (industry) {
          response[symbol].industry = industry;
        }

        const sector = this.parseSector(value.summaryProfile?.sector);
        if (sector) {
          response[symbol].sector = sector;
        }

        const url = value.summaryProfile?.website;
        if (url) {
          response[symbol].url = url;
        }
      }

      return response;
    } catch (error) {
      console.error(error);

      return {};
    }
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

    const yahooSymbols = aSymbols.map((symbol) => {
      return this.convertToYahooSymbol(symbol);
    });

    try {
      const historicalData: {
        [symbol: string]: IYahooFinanceHistoricalResponse[];
      } = await yahooFinance.historical({
        symbols: yahooSymbols,
        from: format(from, 'yyyy-MM-dd'),
        to: format(to, 'yyyy-MM-dd')
      });

      const response: {
        [symbol: string]: { [date: string]: IDataProviderHistoricalResponse };
      } = {};

      for (const [yahooSymbol, timeSeries] of Object.entries(historicalData)) {
        // Convert symbols back
        const symbol = convertFromYahooSymbol(yahooSymbol);
        response[symbol] = {};

        timeSeries.forEach((timeSerie) => {
          response[symbol][format(timeSerie.date, 'yyyy-MM-dd')] = {
            marketPrice: timeSerie.close,
            performance: timeSerie.open - timeSerie.close
          };
        });
      }

      return response;
    } catch (error) {
      console.error(error);

      return {};
    }
  }

  /**
   * Converts a symbol to a Yahoo symbol
   *
   * Currency:        USDCHF=X
   * Cryptocurrency:  BTC-USD
   */
  private convertToYahooSymbol(aSymbol: string) {
    if (isCurrency(aSymbol)) {
      if (isCrypto(aSymbol)) {
        // Add a dash before the last three characters
        // BTCUSD  -> BTC-USD
        // DOGEUSD -> DOGE-USD
        return `${aSymbol.substring(0, aSymbol.length - 3)}-${aSymbol.substring(
          aSymbol.length - 3
        )}`;
      }

      return `${aSymbol}=X`;
    }

    return aSymbol;
  }

  private getType(aSymbol: string, aValue: IYahooFinanceQuoteResponse): Type {
    if (isCrypto(aSymbol)) {
      return Type.Cryptocurrency;
    } else if (aValue.price?.quoteType.toLowerCase() === 'equity') {
      return Type.Stock;
    }

    return aValue.price?.quoteType.toLowerCase();
  }

  private parseExchange(aString: string): string {
    if (aString?.toLowerCase() === 'ccc') {
      return 'Other';
    }

    return aString;
  }

  private parseIndustry(aString: string): Industry {
    if (aString === undefined) {
      return undefined;
    }

    if (aString?.toLowerCase() === 'auto manufacturers') {
      return Industry.Automotive;
    } else if (aString?.toLowerCase() === 'biotechnology') {
      return Industry.Biotechnology;
    } else if (
      aString?.toLowerCase() === 'drug manufacturers—specialty & generic'
    ) {
      return Industry.Pharmaceutical;
    } else if (
      aString?.toLowerCase() === 'internet content & information' ||
      aString?.toLowerCase() === 'internet retail'
    ) {
      return Industry.Internet;
    } else if (aString?.toLowerCase() === 'packaged foods') {
      return Industry.Food;
    } else if (aString?.toLowerCase() === 'software—application') {
      return Industry.Software;
    }

    return Industry.Other;
  }

  private parseSector(aString: string): Sector {
    if (aString === undefined) {
      return undefined;
    }

    if (
      aString?.toLowerCase() === 'consumer cyclical' ||
      aString?.toLowerCase() === 'consumer defensive'
    ) {
      return Sector.Consumer;
    } else if (aString?.toLowerCase() === 'healthcare') {
      return Sector.Healthcare;
    } else if (
      aString?.toLowerCase() === 'communication services' ||
      aString?.toLowerCase() === 'technology'
    ) {
      return Sector.Technology;
    }

    return Sector.Other;
  }

  private parseType(aString: string): Type {
    if (aString?.toLowerCase() === 'cryptocurrency') {
      return Type.Cryptocurrency;
    } else if (aString?.toLowerCase() === 'etf') {
      return Type.ETF;
    } else if (aString?.toLowerCase() === 'stock') {
      return Type.Stock;
    }

    return Type.Other;
  }
}

export const convertFromYahooSymbol = (aSymbol: string) => {
  let symbol = aSymbol.replace('-', '');
  return symbol.replace('=X', '');
};
