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
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import {
  DEFAULT_CURRENCY,
  REPLACE_NAME_PARTS
} from '@ghostfolio/common/config';
import { DATE_FORMAT, isCurrency } from '@ghostfolio/common/helper';
import { DataProviderInfo } from '@ghostfolio/common/interfaces';

import { Injectable, Logger } from '@nestjs/common';
import {
  AssetClass,
  AssetSubClass,
  DataSource,
  SymbolProfile
} from '@prisma/client';
import { addDays, format, isSameDay, isToday } from 'date-fns';
import got from 'got';
import { isNumber } from 'lodash';

@Injectable()
export class EodHistoricalDataService implements DataProviderInterface {
  private apiKey: string;
  private readonly URL = 'https://eodhistoricaldata.com/api';

  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly symbolProfileService: SymbolProfileService
  ) {
    this.apiKey = this.configurationService.get('API_KEY_EOD_HISTORICAL_DATA');
  }

  public canHandle(symbol: string) {
    return true;
  }

  public async getAssetProfile({
    symbol
  }: {
    symbol: string;
  }): Promise<Partial<SymbolProfile>> {
    const [searchResult] = await this.getSearchResult(symbol);

    return {
      symbol,
      assetClass: searchResult?.assetClass,
      assetSubClass: searchResult?.assetSubClass,
      currency: this.convertCurrency(searchResult?.currency),
      dataSource: this.getName(),
      isin: searchResult?.isin,
      name: searchResult?.name
    };
  }

  public getDataProviderInfo(): DataProviderInfo {
    return {
      isPremium: true
    };
  }

  public async getDividends({
    from,
    requestTimeout = this.configurationService.get('REQUEST_TIMEOUT'),
    symbol,
    to
  }: GetDividendsParams): Promise<{
    [date: string]: IDataProviderHistoricalResponse;
  }> {
    symbol = this.convertToEodSymbol(symbol);

    if (isSameDay(from, to)) {
      to = addDays(to, 1);
    }

    try {
      const abortController = new AbortController();

      const response: {
        [date: string]: IDataProviderHistoricalResponse;
      } = {};

      setTimeout(() => {
        abortController.abort();
      }, requestTimeout);

      const historicalResult = await got(
        `${this.URL}/div/${symbol}?api_token=${
          this.apiKey
        }&fmt=json&from=${format(from, DATE_FORMAT)}&to=${format(
          to,
          DATE_FORMAT
        )}`,
        {
          // @ts-ignore
          signal: abortController.signal
        }
      ).json<any>();

      for (const { date, value } of historicalResult) {
        response[date] = {
          marketPrice: value
        };
      }

      return response;
    } catch (error) {
      Logger.error(
        `Could not get dividends for ${symbol} (${this.getName()}) from ${format(
          from,
          DATE_FORMAT
        )} to ${format(to, DATE_FORMAT)}: [${error.name}] ${error.message}`,
        'EodHistoricalDataService'
      );

      return {};
    }
  }

  public async getHistorical({
    from,
    granularity = 'day',
    requestTimeout = this.configurationService.get('REQUEST_TIMEOUT'),
    symbol,
    to
  }: GetHistoricalParams): Promise<{
    [symbol: string]: { [date: string]: IDataProviderHistoricalResponse };
  }> {
    symbol = this.convertToEodSymbol(symbol);

    try {
      const abortController = new AbortController();

      setTimeout(() => {
        abortController.abort();
      }, requestTimeout);

      const response = await got(
        `${this.URL}/eod/${symbol}?api_token=${
          this.apiKey
        }&fmt=json&from=${format(from, DATE_FORMAT)}&to=${format(
          to,
          DATE_FORMAT
        )}&period=${granularity}`,
        {
          // @ts-ignore
          signal: abortController.signal
        }
      ).json<any>();

      return response.reduce(
        (result, { close, date }, index, array) => {
          if (isNumber(close)) {
            result[this.convertFromEodSymbol(symbol)][date] = {
              marketPrice: close
            };
          } else {
            Logger.error(
              `Could not get historical market data for ${symbol} (${this.getName()}) at ${date}`,
              'EodHistoricalDataService'
            );
          }

          return result;
        },
        { [this.convertFromEodSymbol(symbol)]: {} }
      );
    } catch (error) {
      throw new Error(
        `Could not get historical market data for ${symbol} (${this.getName()}) from ${format(
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
    requestTimeout = this.configurationService.get('REQUEST_TIMEOUT'),
    symbols
  }: GetQuotesParams): Promise<{ [symbol: string]: IDataProviderResponse }> {
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

      const symbolProfiles = await this.symbolProfileService.getSymbolProfiles(
        symbols.map((symbol) => {
          return {
            symbol,
            dataSource: this.getName()
          };
        })
      );

      for (const { close, code, timestamp } of quotes) {
        let currency: string;

        if (code.endsWith('.FOREX')) {
          currency = this.convertFromEodSymbol(code)?.replace(
            DEFAULT_CURRENCY,
            ''
          );
        }

        if (!currency) {
          currency = symbolProfiles.find(({ symbol }) => {
            return symbol === code;
          })?.currency;
        }

        if (!currency) {
          const { items } = await this.search({ query: code });

          if (items.length === 1) {
            currency = items[0].currency;
          }
        }

        if (isNumber(close)) {
          response[this.convertFromEodSymbol(code)] = {
            currency,
            dataSource: this.getName(),
            marketPrice: close,
            marketState: isToday(new Date(timestamp * 1000)) ? 'open' : 'closed'
          };
        } else {
          Logger.error(
            `Could not get quote for ${this.convertFromEodSymbol(code)} (${this.getName()})`,
            'EodHistoricalDataService'
          );
        }
      }

      return response;
    } catch (error) {
      let message = error;

      if (error?.code === 'ABORT_ERR') {
        message = `RequestError: The operation to get the quotes was aborted because the request to the data provider took more than ${this.configurationService.get(
          'REQUEST_TIMEOUT'
        )}ms`;
      }

      Logger.error(message, 'EodHistoricalDataService');
    }

    return {};
  }

  public getTestSymbol() {
    return 'AAPL.US';
  }

  public async search({
    query
  }: GetSearchParams): Promise<{ items: LookupItem[] }> {
    const searchResult = await this.getSearchResult(query);

    return {
      items: searchResult
        .filter(({ currency, symbol }) => {
          // Remove 'NA' currency and exchange rates
          return currency?.length === 3 && !symbol.endsWith('.FOREX');
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
              currency: this.convertCurrency(currency),
              dataProviderInfo: this.getDataProviderInfo()
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

  private formatName({ name }: { name: string }) {
    if (name) {
      for (const part of REPLACE_NAME_PARTS) {
        name = name.replace(part, '');
      }

      name = name.trim();
    }

    return name;
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
      }, this.configurationService.get('REQUEST_TIMEOUT'));

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
            currency: this.convertCurrency(Currency),
            dataSource: this.getName(),
            name: this.formatName({ name }),
            symbol: `${Code}.${Exchange}`
          };
        }
      );
    } catch (error) {
      let message = error;

      if (error?.code === 'ABORT_ERR') {
        message = `RequestError: The operation to search for ${aQuery} was aborted because the request to the data provider took more than ${this.configurationService.get(
          'REQUEST_TIMEOUT'
        )}ms`;
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
