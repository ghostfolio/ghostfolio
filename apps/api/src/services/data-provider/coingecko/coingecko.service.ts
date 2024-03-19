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
import { DEFAULT_CURRENCY } from '@ghostfolio/common/config';
import { DATE_FORMAT } from '@ghostfolio/common/helper';
import { DataProviderInfo } from '@ghostfolio/common/interfaces';

import { Injectable, Logger } from '@nestjs/common';
import {
  AssetClass,
  AssetSubClass,
  DataSource,
  SymbolProfile
} from '@prisma/client';
import { format, fromUnixTime, getUnixTime } from 'date-fns';
import got, { Headers } from 'got';

@Injectable()
export class CoinGeckoService implements DataProviderInterface {
  private readonly apiUrl: string;
  private readonly headers: Headers = {};

  public constructor(
    private readonly configurationService: ConfigurationService
  ) {
    const apiKeyDemo = this.configurationService.get('API_KEY_COINGECKO_DEMO');
    const apiKeyPro = this.configurationService.get('API_KEY_COINGECKO_PRO');

    this.apiUrl = 'https://api.coingecko.com/api/v3';

    if (apiKeyDemo) {
      this.headers['x-cg-demo-api-key'] = apiKeyDemo;
    }

    if (apiKeyPro) {
      this.apiUrl = 'https://pro-api.coingecko.com/api/v3';
      this.headers['x-cg-pro-api-key'] = apiKeyPro;
    }
  }

  public canHandle(symbol: string) {
    return true;
  }

  public async getAssetProfile({
    symbol
  }: {
    symbol: string;
  }): Promise<Partial<SymbolProfile>> {
    const response: Partial<SymbolProfile> = {
      symbol,
      assetClass: AssetClass.CASH,
      assetSubClass: AssetSubClass.CRYPTOCURRENCY,
      currency: DEFAULT_CURRENCY,
      dataSource: this.getName()
    };

    try {
      const abortController = new AbortController();

      setTimeout(() => {
        abortController.abort();
      }, this.configurationService.get('REQUEST_TIMEOUT'));

      const { name } = await got(`${this.apiUrl}/coins/${symbol}`, {
        headers: this.headers,
        // @ts-ignore
        signal: abortController.signal
      }).json<any>();

      response.name = name;
    } catch (error) {
      let message = error;

      if (error?.code === 'ABORT_ERR') {
        message = `RequestError: The operation to get the asset profile for ${symbol} was aborted because the request to the data provider took more than ${this.configurationService.get(
          'REQUEST_TIMEOUT'
        )}ms`;
      }

      Logger.error(message, 'CoinGeckoService');
    }

    return response;
  }

  public getDataProviderInfo(): DataProviderInfo {
    return {
      isPremium: false,
      name: 'CoinGecko',
      url: 'https://coingecko.com'
    };
  }

  public async getDividends({}: GetDividendsParams) {
    return {};
  }

  public async getHistorical({
    from,
    requestTimeout = this.configurationService.get('REQUEST_TIMEOUT'),
    symbol,
    to
  }: GetHistoricalParams): Promise<{
    [symbol: string]: { [date: string]: IDataProviderHistoricalResponse };
  }> {
    try {
      const abortController = new AbortController();

      setTimeout(() => {
        abortController.abort();
      }, requestTimeout);

      const { prices } = await got(
        `${
          this.apiUrl
        }/coins/${symbol}/market_chart/range?vs_currency=${DEFAULT_CURRENCY.toLowerCase()}&from=${getUnixTime(
          from
        )}&to=${getUnixTime(to)}`,
        {
          headers: this.headers,
          // @ts-ignore
          signal: abortController.signal
        }
      ).json<any>();

      const result: {
        [symbol: string]: { [date: string]: IDataProviderHistoricalResponse };
      } = {
        [symbol]: {}
      };

      for (const [timestamp, marketPrice] of prices) {
        result[symbol][format(fromUnixTime(timestamp / 1000), DATE_FORMAT)] = {
          marketPrice
        };
      }

      return result;
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
    return 50;
  }

  public getName(): DataSource {
    return DataSource.COINGECKO;
  }

  public async getQuotes({
    requestTimeout = this.configurationService.get('REQUEST_TIMEOUT'),
    symbols
  }: GetQuotesParams): Promise<{ [symbol: string]: IDataProviderResponse }> {
    const response: { [symbol: string]: IDataProviderResponse } = {};

    if (symbols.length <= 0) {
      return response;
    }

    try {
      const abortController = new AbortController();

      setTimeout(() => {
        abortController.abort();
      }, requestTimeout);

      const quotes = await got(
        `${this.apiUrl}/simple/price?ids=${symbols.join(
          ','
        )}&vs_currencies=${DEFAULT_CURRENCY.toLowerCase()}`,
        {
          headers: this.headers,
          // @ts-ignore
          signal: abortController.signal
        }
      ).json<any>();

      for (const symbol in quotes) {
        response[symbol] = {
          currency: DEFAULT_CURRENCY,
          dataProviderInfo: this.getDataProviderInfo(),
          dataSource: DataSource.COINGECKO,
          marketPrice: quotes[symbol][DEFAULT_CURRENCY.toLowerCase()],
          marketState: 'open'
        };
      }
    } catch (error) {
      let message = error;

      if (error?.code === 'ABORT_ERR') {
        message = `RequestError: The operation to get the quotes was aborted because the request to the data provider took more than ${this.configurationService.get(
          'REQUEST_TIMEOUT'
        )}ms`;
      }

      Logger.error(message, 'CoinGeckoService');
    }

    return response;
  }

  public getTestSymbol() {
    return 'bitcoin';
  }

  public async search({
    query
  }: GetSearchParams): Promise<{ items: LookupItem[] }> {
    let items: LookupItem[] = [];

    try {
      const abortController = new AbortController();

      setTimeout(() => {
        abortController.abort();
      }, this.configurationService.get('REQUEST_TIMEOUT'));

      const { coins } = await got(`${this.apiUrl}/search?query=${query}`, {
        headers: this.headers,
        // @ts-ignore
        signal: abortController.signal
      }).json<any>();

      items = coins.map(({ id: symbol, name }) => {
        return {
          name,
          symbol,
          assetClass: AssetClass.CASH,
          assetSubClass: AssetSubClass.CRYPTOCURRENCY,
          currency: DEFAULT_CURRENCY,
          dataProviderInfo: this.getDataProviderInfo(),
          dataSource: this.getName()
        };
      });
    } catch (error) {
      let message = error;

      if (error?.code === 'ABORT_ERR') {
        message = `RequestError: The operation to search for ${query} was aborted because the request to the data provider took more than ${this.configurationService.get(
          'REQUEST_TIMEOUT'
        )}ms`;
      }

      Logger.error(message, 'CoinGeckoService');
    }

    return { items };
  }
}
