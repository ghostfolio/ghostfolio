import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { DataProviderInterface } from '@ghostfolio/api/services/data-provider/interfaces/data-provider.interface';
import {
  IDataProviderHistoricalResponse,
  IDataProviderResponse
} from '@ghostfolio/api/services/interfaces/interfaces';
import { DATE_FORMAT, isCurrency } from '@ghostfolio/common/helper';
import { Granularity } from '@ghostfolio/common/types';
import { Injectable, Logger } from '@nestjs/common';
import {
  AssetClass,
  AssetSubClass,
  DataSource,
  SymbolProfile
} from '@prisma/client';
import bent from 'bent';
import Big from 'big.js';
import { format, isToday } from 'date-fns';

@Injectable()
export class EodHistoricalDataService implements DataProviderInterface {
  private apiKey: string;
  private baseCurrency: string;
  private readonly URL = 'https://eodhistoricaldata.com/api';

  public constructor(
    private readonly configurationService: ConfigurationService
  ) {
    this.apiKey = this.configurationService.get('EOD_HISTORICAL_DATA_API_KEY');
    this.baseCurrency = this.configurationService.get('BASE_CURRENCY');
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
      const get = bent(
        `${this.URL}/eod/${symbol}?api_token=${
          this.apiKey
        }&fmt=json&from=${format(from, DATE_FORMAT)}&to=${format(
          to,
          DATE_FORMAT
        )}&period={aGranularity}`,
        'GET',
        'json',
        200
      );

      const response = await get();

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

  public async getQuotes(
    aSymbols: string[]
  ): Promise<{ [symbol: string]: IDataProviderResponse }> {
    const symbols = aSymbols.map((symbol) => {
      return this.convertToEodSymbol(symbol);
    });

    if (symbols.length <= 0) {
      return {};
    }

    try {
      const get = bent(
        `${this.URL}/real-time/${symbols[0]}?api_token=${
          this.apiKey
        }&fmt=json&s=${symbols.join(',')}`,
        'GET',
        'json',
        200
      );

      const realTimeResponse = await get();

      const quotes =
        symbols.length === 1 ? [realTimeResponse] : realTimeResponse;

      const searchResponse = await Promise.all(
        symbols
          .filter((symbol) => {
            return !symbol.endsWith('.FOREX');
          })
          .map((symbol) => {
            return this.search(symbol);
          })
      );

      const lookupItems = searchResponse.flat().map(({ items }) => {
        return items[0];
      });

      const response = quotes.reduce(
        (
          result: { [symbol: string]: IDataProviderResponse },
          { close, code, timestamp }
        ) => {
          const currency = lookupItems.find((lookupItem) => {
            return lookupItem.symbol === code;
          })?.currency;

          result[this.convertFromEodSymbol(code)] = {
            currency: currency ?? this.baseCurrency,
            dataSource: DataSource.EOD_HISTORICAL_DATA,
            marketPrice: close,
            marketState: isToday(new Date(timestamp * 1000)) ? 'open' : 'closed'
          };

          return result;
        },
        {}
      );

      if (response[`${this.baseCurrency}GBP`]) {
        response[`${this.baseCurrency}GBp`] = {
          ...response[`${this.baseCurrency}GBP`],
          currency: `${this.baseCurrency}GBp`,
          marketPrice: this.getConvertedValue({
            symbol: `${this.baseCurrency}GBp`,
            value: response[`${this.baseCurrency}GBP`].marketPrice
          })
        };
      }

      if (response[`${this.baseCurrency}ILS`]) {
        response[`${this.baseCurrency}ILA`] = {
          ...response[`${this.baseCurrency}ILS`],
          currency: `${this.baseCurrency}ILA`,
          marketPrice: this.getConvertedValue({
            symbol: `${this.baseCurrency}ILA`,
            value: response[`${this.baseCurrency}ILS`].marketPrice
          })
        };
      }

      return response;
    } catch (error) {
      Logger.error(error, 'EodHistoricalDataService');
    }

    return {};
  }

  public getTestSymbol() {
    return 'AAPL.US';
  }

  public async search(aQuery: string): Promise<{ items: LookupItem[] }> {
    const searchResult = await this.getSearchResult(aQuery);

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
      symbol = `${this.baseCurrency}${symbol}`;
    }

    return symbol;
  }

  /**
   * Converts a symbol to a EOD symbol
   *
   * Currency:  USDCHF  -> CHF.FOREX
   */
  private convertToEodSymbol(aSymbol: string) {
    if (
      aSymbol.startsWith(this.baseCurrency) &&
      aSymbol.length > this.baseCurrency.length
    ) {
      if (
        isCurrency(
          aSymbol.substring(0, aSymbol.length - this.baseCurrency.length)
        )
      ) {
        return `${aSymbol
          .replace('GBp', 'GBX')
          .replace(this.baseCurrency, '')}.FOREX`;
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
    if (symbol === `${this.baseCurrency}GBp`) {
      // Convert GPB to GBp (pence)
      return new Big(value).mul(100).toNumber();
    } else if (symbol === `${this.baseCurrency}ILA`) {
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
      const get = bent(
        `${this.URL}/search/${aQuery}?api_token=${this.apiKey}`,
        'GET',
        'json',
        200
      );
      const response = await get();

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
      Logger.error(error, 'EodHistoricalDataService');
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
