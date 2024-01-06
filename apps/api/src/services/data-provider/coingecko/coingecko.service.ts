import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { DataProviderInterface } from '@ghostfolio/api/services/data-provider/interfaces/data-provider.interface';
import {
  IDataProviderHistoricalResponse,
  IDataProviderResponse
} from '@ghostfolio/api/services/interfaces/interfaces';
import { DEFAULT_CURRENCY } from '@ghostfolio/common/config';
import { DATE_FORMAT } from '@ghostfolio/common/helper';
import { DataProviderInfo } from '@ghostfolio/common/interfaces';
import { Granularity } from '@ghostfolio/common/types';
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

  public async getAssetProfile(
    aSymbol: string
  ): Promise<Partial<SymbolProfile>> {
    const response: Partial<SymbolProfile> = {
      assetClass: AssetClass.CASH,
      assetSubClass: AssetSubClass.CRYPTOCURRENCY,
      currency: DEFAULT_CURRENCY,
      dataSource: this.getName(),
      symbol: aSymbol
    };

    try {
      const abortController = new AbortController();

      setTimeout(() => {
        abortController.abort();
      }, this.configurationService.get('REQUEST_TIMEOUT'));

      const { name } = await got(`${this.apiUrl}/coins/${aSymbol}`, {
        headers: this.headers,
        // @ts-ignore
        signal: abortController.signal
      }).json<any>();

      response.name = name;
    } catch (error) {
      let message = error;

      if (error?.code === 'ABORT_ERR') {
        message = `RequestError: The operation was aborted because the request to the data provider took more than ${this.configurationService.get(
          'REQUEST_TIMEOUT'
        )}ms`;
      }

      Logger.error(message, 'CoinGeckoService');
    }

    return response;
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
    try {
      const abortController = new AbortController();

      setTimeout(() => {
        abortController.abort();
      }, this.configurationService.get('REQUEST_TIMEOUT'));

      const { prices } = await got(
        `${
          this.apiUrl
        }/coins/${aSymbol}/market_chart/range?vs_currency=${DEFAULT_CURRENCY.toLowerCase()}&from=${getUnixTime(
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
        [aSymbol]: {}
      };

      for (const [timestamp, marketPrice] of prices) {
        result[aSymbol][format(fromUnixTime(timestamp / 1000), DATE_FORMAT)] = {
          marketPrice
        };
      }

      return result;
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
    return 50;
  }

  public getName(): DataSource {
    return DataSource.COINGECKO;
  }

  public async getQuotes({
    requestTimeout = this.configurationService.get('REQUEST_TIMEOUT'),
    symbols
  }: {
    requestTimeout?: number;
    symbols: string[];
  }): Promise<{ [symbol: string]: IDataProviderResponse }> {
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
        message = `RequestError: The operation was aborted because the request to the data provider took more than ${this.configurationService.get(
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
    includeIndices = false,
    query
  }: {
    includeIndices?: boolean;
    query: string;
  }): Promise<{ items: LookupItem[] }> {
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
          dataSource: this.getName()
        };
      });
    } catch (error) {
      let message = error;

      if (error?.code === 'ABORT_ERR') {
        message = `RequestError: The operation was aborted because the request to the data provider took more than ${this.configurationService.get(
          'REQUEST_TIMEOUT'
        )}ms`;
      }

      Logger.error(message, 'CoinGeckoService');
    }

    return { items };
  }

  private getDataProviderInfo(): DataProviderInfo {
    return {
      name: 'CoinGecko',
      url: 'https://coingecko.com'
    };
  }
}
