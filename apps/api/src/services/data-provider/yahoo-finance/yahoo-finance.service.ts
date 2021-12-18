import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import { CryptocurrencyService } from '@ghostfolio/api/services/cryptocurrency/cryptocurrency.service';
import { baseCurrency, UNKNOWN_KEY } from '@ghostfolio/common/config';
import { DATE_FORMAT, isCurrency } from '@ghostfolio/common/helper';
import { Granularity } from '@ghostfolio/common/types';
import { Injectable, Logger } from '@nestjs/common';
import { AssetClass, AssetSubClass, DataSource } from '@prisma/client';
import * as bent from 'bent';
import Big from 'big.js';
import { countries } from 'countries-list';
import { addDays, format, isSameDay } from 'date-fns';
import * as yahooFinance from 'yahoo-finance';

import {
  IDataProviderHistoricalResponse,
  IDataProviderResponse,
  MarketState
} from '../../interfaces/interfaces';
import { DataProviderInterface } from '../interfaces/data-provider.interface';
import {
  IYahooFinanceHistoricalResponse,
  IYahooFinancePrice,
  IYahooFinanceQuoteResponse
} from './interfaces/interfaces';

@Injectable()
export class YahooFinanceService implements DataProviderInterface {
  private yahooFinanceHostname = 'https://query1.finance.yahoo.com';

  public constructor(
    private readonly cryptocurrencyService: CryptocurrencyService
  ) {}

  public canHandle(symbol: string) {
    return true;
  }

  public convertFromYahooFinanceSymbol(aYahooFinanceSymbol: string) {
    const symbol = aYahooFinanceSymbol.replace(
      new RegExp(`-${baseCurrency}$`),
      baseCurrency
    );
    return symbol.replace('=X', '');
  }

  /**
   * Converts a symbol to a Yahoo Finance symbol
   *
   * Currency:        USDCHF  -> USDCHF=X
   * Cryptocurrency:  BTCUSD  -> BTC-USD
   *                  DOGEUSD -> DOGE-USD
   *                  SOL1USD -> SOL1-USD
   */
  public convertToYahooFinanceSymbol(aSymbol: string) {
    if (aSymbol.includes(baseCurrency) && aSymbol.length >= 6) {
      if (isCurrency(aSymbol.substring(0, aSymbol.length - 3))) {
        return `${aSymbol}=X`;
      } else if (
        this.cryptocurrencyService.isCryptocurrency(
          aSymbol
            .replace(new RegExp(`-${baseCurrency}$`), baseCurrency)
            .replace('1', '')
        )
      ) {
        // Add a dash before the last three characters
        // BTCUSD  -> BTC-USD
        // DOGEUSD -> DOGE-USD
        // SOL1USD -> SOL1-USD
        return aSymbol.replace(
          new RegExp(`-?${baseCurrency}$`),
          `-${baseCurrency}`
        );
      }
    }

    return aSymbol;
  }

  public async get(
    aSymbols: string[]
  ): Promise<{ [symbol: string]: IDataProviderResponse }> {
    if (aSymbols.length <= 0) {
      return {};
    }
    const yahooFinanceSymbols = aSymbols.map((symbol) =>
      this.convertToYahooFinanceSymbol(symbol)
    );

    try {
      const response: { [symbol: string]: IDataProviderResponse } = {};

      const data: {
        [symbol: string]: IYahooFinanceQuoteResponse;
      } = await yahooFinance.quote({
        modules: ['price', 'summaryProfile'],
        symbols: yahooFinanceSymbols
      });

      for (const [yahooFinanceSymbol, value] of Object.entries(data)) {
        // Convert symbols back
        const symbol = this.convertFromYahooFinanceSymbol(yahooFinanceSymbol);

        const { assetClass, assetSubClass } = this.parseAssetClass(value.price);

        response[symbol] = {
          assetClass,
          assetSubClass,
          currency: value.price?.currency,
          dataSource: DataSource.YAHOO,
          exchange: this.parseExchange(value.price?.exchangeName),
          marketState:
            value.price?.marketState === 'REGULAR' ||
            this.cryptocurrencyService.isCryptocurrency(symbol)
              ? MarketState.open
              : MarketState.closed,
          marketPrice: value.price?.regularMarketPrice || 0,
          name: value.price?.longName || value.price?.shortName || symbol
        };

        if (value.price?.currency === 'GBp') {
          // Convert GBp (pence) to GBP
          response[symbol].currency = 'GBP';
          response[symbol].marketPrice = new Big(
            value.price?.regularMarketPrice ?? 0
          )
            .div(100)
            .toNumber();
        }

        // Add country if stock and available
        if (
          assetSubClass === AssetSubClass.STOCK &&
          value.summaryProfile?.country
        ) {
          try {
            const [code] = Object.entries(countries).find(([, country]) => {
              return country.name === value.summaryProfile?.country;
            });

            if (code) {
              response[symbol].countries = [{ code, weight: 1 }];
            }
          } catch {}

          if (value.summaryProfile?.sector) {
            response[symbol].sectors = [
              { name: value.summaryProfile?.sector, weight: 1 }
            ];
          }
        }

        // Add url if available
        const url = value.summaryProfile?.website;
        if (url) {
          response[symbol].url = url;
        }
      }

      return response;
    } catch (error) {
      Logger.error(error);

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

    if (isSameDay(from, to)) {
      to = addDays(to, 1);
    }

    const yahooFinanceSymbols = aSymbols.map((symbol) => {
      return this.convertToYahooFinanceSymbol(symbol);
    });

    try {
      const historicalData: {
        [symbol: string]: IYahooFinanceHistoricalResponse[];
      } = await yahooFinance.historical({
        symbols: yahooFinanceSymbols,
        from: format(from, DATE_FORMAT),
        to: format(to, DATE_FORMAT)
      });

      const response: {
        [symbol: string]: { [date: string]: IDataProviderHistoricalResponse };
      } = {};

      for (const [yahooFinanceSymbol, timeSeries] of Object.entries(
        historicalData
      )) {
        // Convert symbols back
        const symbol = this.convertFromYahooFinanceSymbol(yahooFinanceSymbol);
        response[symbol] = {};

        timeSeries.forEach((timeSerie) => {
          response[symbol][format(timeSerie.date, DATE_FORMAT)] = {
            marketPrice: timeSerie.close,
            performance: timeSerie.open - timeSerie.close
          };
        });
      }

      return response;
    } catch (error) {
      Logger.error(error);

      return {};
    }
  }

  public getName(): DataSource {
    return DataSource.YAHOO;
  }

  public async search(aSymbol: string): Promise<{ items: LookupItem[] }> {
    const items: LookupItem[] = [];

    try {
      const get = bent(
        `${this.yahooFinanceHostname}/v1/finance/search?q=${aSymbol}&lang=en-US&region=US&quotesCount=8&newsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query&multiQuoteQueryId=multi_quote_single_token_query&newsQueryId=news_cie_vespa&enableCb=true&enableNavLinks=false&enableEnhancedTrivialQuery=true`,
        'GET',
        'json',
        200
      );

      const searchResult = await get();

      const symbols: string[] = searchResult.quotes
        .filter((quote) => {
          // filter out undefined symbols
          return quote.symbol;
        })
        .filter(({ quoteType, symbol }) => {
          return (
            (quoteType === 'CRYPTOCURRENCY' &&
              this.cryptocurrencyService.isCryptocurrency(
                symbol
                  .replace(new RegExp(`-${baseCurrency}$`), baseCurrency)
                  .replace('1', '')
              )) ||
            quoteType === 'EQUITY' ||
            quoteType === 'ETF'
          );
        })
        .filter(({ quoteType, symbol }) => {
          if (quoteType === 'CRYPTOCURRENCY') {
            // Only allow cryptocurrencies in base currency to avoid having redundancy in the database.
            // Transactions need to be converted manually to the base currency before
            return symbol.includes(baseCurrency);
          }

          return true;
        })
        .map(({ symbol }) => {
          return symbol;
        });

      const marketData = await this.get(symbols);

      for (const [symbol, value] of Object.entries(marketData)) {
        items.push({
          symbol,
          currency: value.currency,
          dataSource: DataSource.YAHOO,
          name: value.name
        });
      }
    } catch {}

    return { items };
  }

  private parseAssetClass(aPrice: IYahooFinancePrice): {
    assetClass: AssetClass;
    assetSubClass: AssetSubClass;
  } {
    let assetClass: AssetClass;
    let assetSubClass: AssetSubClass;

    switch (aPrice?.quoteType?.toLowerCase()) {
      case 'cryptocurrency':
        assetClass = AssetClass.CASH;
        assetSubClass = AssetSubClass.CRYPTOCURRENCY;
        break;
      case 'equity':
        assetClass = AssetClass.EQUITY;
        assetSubClass = AssetSubClass.STOCK;
        break;
      case 'etf':
        assetClass = AssetClass.EQUITY;
        assetSubClass = AssetSubClass.ETF;
        break;
    }

    return { assetClass, assetSubClass };
  }

  private parseExchange(aString: string): string {
    if (aString?.toLowerCase() === 'ccc') {
      return UNKNOWN_KEY;
    }

    return aString;
  }
}
