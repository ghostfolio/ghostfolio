import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { DataProviderInterface } from '@ghostfolio/api/services/data-provider/interfaces/data-provider.interface';
import {
  IDataProviderHistoricalResponse,
  IDataProviderResponse
} from '@ghostfolio/api/services/interfaces/interfaces';
import {
  DEFAULT_CURRENCY,
  DEFAULT_REQUEST_TIMEOUT
} from '@ghostfolio/common/config';
import { DATE_FORMAT, isCurrency } from '@ghostfolio/common/helper';
import { Granularity } from '@ghostfolio/common/types';
import { Injectable, Logger } from '@nestjs/common';
import {
  AssetClass,
  AssetSubClass,
  DataSource,
  SymbolProfile
} from '@prisma/client';
import Big from 'big.js';
import { format, isToday } from 'date-fns';
import got from 'got';

@Injectable()
export class EodHistoricalDataService implements DataProviderInterface {
  private apiKey: string;
  private readonly URL = 'https://eodhistoricaldata.com/api';

  public constructor(
    private readonly configurationService: ConfigurationService
  ) {
    this.apiKey = this.configurationService.get('EOD_HISTORICAL_DATA_API_KEY');
  }

  public canHandle(symbol: string) {
    return true;
  }

  public async getAssetProfile(
    aSymbol: string
  ): Promise<Partial<SymbolProfile>> {
    const [searchResult] = await this.getSearchResult(aSymbol);

    return {
      assetClass: searchResult?.assetClass,
      assetSubClass: searchResult?.assetSubClass,
      currency: this.convertCurrency(searchResult?.currency),
      dataSource: this.getName(),
      isin: searchResult?.isin,
      name: searchResult?.name,
      symbol: aSymbol
    };
  }

  public async getDividends({
    from,
    granularity = 'day',
    symbol,
    to
  }: {
    from: Date;
    granularity: Granularity;
    symbol: string;
    to: Date;
  }) {
    return {};
  }

  public async getHistorical(
    aSymbol: string,
    aGranularity: Granularity = 'day',
    from: Date,
    to: Date
  ): Promise<{
    [symbol: string]: { [date: string]: IDataProviderHistoricalResponse };
  }> {
    const symbol = this.convertToEodSymbol(aSymbol);

    try {
      const abortController = new AbortController();

      setTimeout(() => {
        abortController.abort();
      }, DEFAULT_REQUEST_TIMEOUT);

      const response = await got(
        `${this.URL}/eod/${symbol}?api_token=${
          this.apiKey
        }&fmt=json&from=${format(from, DATE_FORMAT)}&to=${format(
          to,
          DATE_FORMAT
        )}&period={aGranularity}`,
        {
          // @ts-ignore
          signal: abortController.signal
        }
      ).json<any>();

      return response.reduce(
        (result, historicalItem, index, array) => {
          result[this.convertFromEodSymbol(symbol)][historicalItem.date] = {
            marketPrice: this.getConvertedValue({
              symbol: aSymbol,
              value: historicalItem.close
            }),
            performance: historicalItem.open - historicalItem.close
          };

          return result;
        },
        { [this.convertFromEodSymbol(symbol)]: {} }
      );
    } catch (error) {
      throw new Error(
        `Could not get historical market data for ${aSymbol} (${this.getName()}) from ${format(
          from,
          DATE_FORMAT
        )} to ${format(to, DATE_FORMAT)}: [${error.name}] ${error.message}`
      );
    }
  }

  public getMaxNumberOfSymbolsPerRequest() {
    // It is not recommended using more than 15-20 tickers per request
    // https://eodhistoricaldata.com/financial-apis/live-realtime-stocks-api
    return 20;
  }

  public getName(): DataSource {
    return DataSource.EOD_HISTORICAL_DATA;
  }

  public async getQuotes({
    requestTimeout = DEFAULT_REQUEST_TIMEOUT,
    symbols
  }: {
    requestTimeout?: number;
    symbols: string[];
  }): Promise<{ [symbol: string]: IDataProviderResponse }> {
    let response: { [symbol: string]: IDataProviderResponse } = {};

    if (symbols.length <= 0) {
      return response;
    }

    const eodHistoricalDataSymbols = symbols.map((symbol) => {
      return this.convertToEodSymbol(symbol);
    });

    try {
      const abortController = new AbortController();

      setTimeout(() => {
        abortController.abort();
      }, requestTimeout);

      const realTimeResponse = await got(
        `${this.URL}/real-time/${eodHistoricalDataSymbols[0]}?api_token=${
          this.apiKey
        }&fmt=json&s=${eodHistoricalDataSymbols.join(',')}`,
        {
          // @ts-ignore
          signal: abortController.signal
        }
      ).json<any>();

      const quotes =
        eodHistoricalDataSymbols.length === 1
          ? [realTimeResponse]
          : realTimeResponse;

      const searchResponse = await Promise.all(
        eodHistoricalDataSymbols
          .filter((symbol) => {
            return !symbol.endsWith('.FOREX');
          })
          .map((symbol) => {
            return this.search({ query: symbol });
          })
      );

      const lookupItems = searchResponse.flat().map(({ items }) => {
        return items[0];
      });

      response = quotes.reduce(
        (
          result: { [symbol: string]: IDataProviderResponse },
          { close, code, timestamp }
        ) => {
          const currency = lookupItems.find((lookupItem) => {
            return lookupItem.symbol === code;
          })?.currency;

          result[this.convertFromEodSymbol(code)] = {
            currency: currency ?? DEFAULT_CURRENCY,
            dataSource: DataSource.EOD_HISTORICAL_DATA,
            marketPrice: close,
            marketState: isToday(new Date(timestamp * 1000)) ? 'open' : 'closed'
          };

          return result;
        },
        {}
      );

      if (response[`${DEFAULT_CURRENCY}GBP`]) {
        response[`${DEFAULT_CURRENCY}GBp`] = {
          ...response[`${DEFAULT_CURRENCY}GBP`],
          currency: `${DEFAULT_CURRENCY}GBp`,
          marketPrice: this.getConvertedValue({
            symbol: `${DEFAULT_CURRENCY}GBp`,
            value: response[`${DEFAULT_CURRENCY}GBP`].marketPrice
          })
        };
      }

      if (response[`${DEFAULT_CURRENCY}ILS`]) {
        response[`${DEFAULT_CURRENCY}ILA`] = {
          ...response[`${DEFAULT_CURRENCY}ILS`],
          currency: `${DEFAULT_CURRENCY}ILA`,
          marketPrice: this.getConvertedValue({
            symbol: `${DEFAULT_CURRENCY}ILA`,
            value: response[`${DEFAULT_CURRENCY}ILS`].marketPrice
          })
        };
      }

      return response;
    } catch (error) {
      let message = error;

      if (error?.code === 'ABORT_ERR') {
        message = `RequestError: The operation was aborted because the request to the data provider took more than ${DEFAULT_REQUEST_TIMEOUT}ms`;
      }

      Logger.error(message, 'EodHistoricalDataService');
    }

    return {};
  }

  public getTestSymbol() {
    return 'AAPL.US';
  }

  public async search({
    includeIndices = false,
    query
  }: {
    includeIndices?: boolean;
    query: string;
  }): Promise<{ items: LookupItem[] }> {
    const searchResult = await this.getSearchResult(query);

    return {
      items: searchResult
        .filter(({ symbol }) => {
          return !symbol.endsWith('.FOREX');
        })
        .map(
          ({
            assetClass,
            assetSubClass,
            currency,
            dataSource,
            name,
            symbol
          }) => {
            return {
              assetClass,
              assetSubClass,
              dataSource,
              name,
              symbol,
              currency: this.convertCurrency(currency)
            };
          }
        )
    };
  }

  private convertCurrency(aCurrency: string) {
    let currency = aCurrency;

    if (currency === 'GBX') {
      currency = 'GBp';
    }

    return currency;
  }

  private convertFromEodSymbol(aEodSymbol: string) {
    let symbol = aEodSymbol;

    if (symbol.endsWith('.FOREX')) {
      symbol = symbol.replace('GBX', 'GBp');
      symbol = symbol.replace('.FOREX', '');
    }

    return symbol;
  }

  /**
   * Converts a symbol to a EOD symbol
   *
   * Currency:  USDCHF  -> USDCHF.FOREX
   */
  private convertToEodSymbol(aSymbol: string) {
    if (
      aSymbol.startsWith(DEFAULT_CURRENCY) &&
      aSymbol.length > DEFAULT_CURRENCY.length
    ) {
      if (
        isCurrency(
          aSymbol.substring(0, aSymbol.length - DEFAULT_CURRENCY.length)
        )
      ) {
        let symbol = aSymbol;
        symbol = symbol.replace('GBp', 'GBX');

        return `${symbol}.FOREX`;
      }
    }

    return aSymbol;
  }

  private getConvertedValue({
    symbol,
    value
  }: {
    symbol: string;
    value: number;
  }) {
    if (symbol === `${DEFAULT_CURRENCY}GBp`) {
      // Convert GPB to GBp (pence)
      return new Big(value).mul(100).toNumber();
    } else if (symbol === `${DEFAULT_CURRENCY}ILA`) {
      // Convert ILS to ILA
      return new Big(value).mul(100).toNumber();
    }

    return value;
  }

  private async getSearchResult(aQuery: string): Promise<
    (LookupItem & {
      assetClass: AssetClass;
      assetSubClass: AssetSubClass;
      isin: string;
    })[]
  > {
    let searchResult = [];

    try {
      const abortController = new AbortController();

      setTimeout(() => {
        abortController.abort();
      }, DEFAULT_REQUEST_TIMEOUT);

      const response = await got(
        `${this.URL}/search/${aQuery}?api_token=${this.apiKey}`,
        {
          // @ts-ignore
          signal: abortController.signal
        }
      ).json<any>();

      searchResult = response.map(
        ({ Code, Currency, Exchange, ISIN: isin, Name: name, Type }) => {
          const { assetClass, assetSubClass } = this.parseAssetClass({
            Exchange,
            Type
          });

          return {
            assetClass,
            assetSubClass,
            isin,
            name,
            currency: this.convertCurrency(Currency),
            dataSource: this.getName(),
            symbol: `${Code}.${Exchange}`
          };
        }
      );
    } catch (error) {
      let message = error;

      if (error?.code === 'ABORT_ERR') {
        message = `RequestError: The operation was aborted because the request to the data provider took more than ${DEFAULT_REQUEST_TIMEOUT}ms`;
      }

      Logger.error(message, 'EodHistoricalDataService');
    }

    return searchResult;
  }

  private parseAssetClass({
    Exchange,
    Type
  }: {
    Exchange: string;
    Type: string;
  }): {
    assetClass: AssetClass;
    assetSubClass: AssetSubClass;
  } {
    let assetClass: AssetClass;
    let assetSubClass: AssetSubClass;

    switch (Type?.toLowerCase()) {
      case 'common stock':
        assetClass = AssetClass.EQUITY;
        assetSubClass = AssetSubClass.STOCK;
        break;
      case 'currency':
        assetClass = AssetClass.CASH;

        if (Exchange?.toLowerCase() === 'cc') {
          assetSubClass = AssetSubClass.CRYPTOCURRENCY;
        }

        break;
      case 'etf':
        assetClass = AssetClass.EQUITY;
        assetSubClass = AssetSubClass.ETF;
        break;
    }

    return { assetClass, assetSubClass };
  }
}
