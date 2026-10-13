import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import {
  DataProviderInterface,
  GetAssetProfileParams,
  GetDividendsParams,
  GetHistoricalParams,
  GetQuotesParams,
  GetSearchParams
} from '@ghostfolio/api/services/data-provider/interfaces/data-provider.interface';
import { FetchService } from '@ghostfolio/api/services/fetch/fetch.service';
import { DEFAULT_CURRENCY } from '@ghostfolio/common/config';
import { DATE_FORMAT } from '@ghostfolio/common/helper';
import {
  DataProviderHistoricalResponse,
  DataProviderInfo,
  DataProviderResponse,
  LookupItem,
  LookupResponse
} from '@ghostfolio/common/interfaces';

import { utc } from '@date-fns/utc';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  AssetClass,
  AssetSubClass,
  DataSource,
  SymbolProfile
} from '@prisma/client';
import { format, fromUnixTime, getUnixTime } from 'date-fns';

@Injectable()
export class CoinGeckoService implements DataProviderInterface, OnModuleInit {
  private readonly logger = new Logger(CoinGeckoService.name);

  private apiUrl: string;
  private headers: HeadersInit = {};

  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly fetchService: FetchService
  ) {}

  public onModuleInit() {
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

  public canHandle() {
    return true;
  }

  public async getAssetProfile({
    symbol
  }: GetAssetProfileParams): Promise<Partial<SymbolProfile>> {
    const { currency, id } = this.parseSymbol(symbol);
    const response: Partial<SymbolProfile> = {
      currency,
      symbol,
      assetClass: AssetClass.LIQUIDITY,
      assetSubClass: AssetSubClass.CRYPTOCURRENCY,
      dataSource: this.getName()
    };

    try {
      const { name } = await this.fetchService
        .fetch(`${this.apiUrl}/coins/${id}`, {
          headers: this.headers,
          signal: AbortSignal.timeout(
            this.configurationService.get('REQUEST_TIMEOUT')
          )
        })
        .then((res) => res.json());

      response.name = name;
    } catch (error) {
      let message = error;

      if (['AbortError', 'TimeoutError'].includes(error?.name)) {
        message = `RequestError: The operation to get the asset profile for ${symbol} was aborted because the request to the data provider took more than ${(
          this.configurationService.get('REQUEST_TIMEOUT') / 1000
        ).toFixed(3)} seconds`;
      }

      this.logger.error(message);
    }

    return response;
  }

  public getDataProviderInfo(): DataProviderInfo {
    return {
      dataSource: DataSource.COINGECKO,
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
    [date: string]: DataProviderHistoricalResponse;
  }> {
    try {
      const { currency, id } = this.parseSymbol(symbol);
      const queryParams = new URLSearchParams({
        from: getUnixTime(from).toString(),
        to: getUnixTime(to).toString(),
        vs_currency: currency.toLowerCase()
      });

      const { error, prices, status } = await this.fetchService
        .fetch(
          `${this.apiUrl}/coins/${id}/market_chart/range?${queryParams.toString()}`,
          {
            headers: this.headers,
            signal: AbortSignal.timeout(requestTimeout)
          }
        )
        .then((res) => res.json());

      if (error?.status) {
        throw new Error(error.status.error_message);
      }

      if (status) {
        throw new Error(status.error_message);
      }

      const result: {
        [date: string]: DataProviderHistoricalResponse;
      } = {};

      for (const [timestamp, marketPrice] of prices) {
        result[
          format(fromUnixTime(timestamp / 1000), DATE_FORMAT, { in: utc })
        ] = {
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
  }: GetQuotesParams): Promise<{ [symbol: string]: DataProviderResponse }> {
    const response: { [symbol: string]: DataProviderResponse } = {};

    if (symbols.length <= 0) {
      return response;
    }

    try {
      const assets = symbols.map((symbol) => {
        return { symbol, ...this.parseSymbol(symbol) };
      });
      const queryParams = new URLSearchParams({
        ids: Array.from(new Set(assets.map(({ id }) => id))).join(','),
        vs_currencies: Array.from(
          new Set(assets.map(({ currency }) => currency.toLowerCase()))
        ).join(',')
      });

      const quotes = await this.fetchService
        .fetch(`${this.apiUrl}/simple/price?${queryParams.toString()}`, {
          headers: this.headers,
          signal: AbortSignal.timeout(requestTimeout)
        })
        .then((res) => res.json());

      for (const { currency, id, symbol } of assets) {
        const marketPrice = quotes[id]?.[currency.toLowerCase()];

        if (typeof marketPrice !== 'number') {
          continue;
        }

        response[symbol] = {
          currency,
          dataProviderInfo: this.getDataProviderInfo(),
          dataSource: DataSource.COINGECKO,
          marketPrice,
          marketState: 'open'
        };
      }
    } catch (error) {
      let message = error;

      if (['AbortError', 'TimeoutError'].includes(error?.name)) {
        message = `RequestError: The operation to get the quotes for ${symbols.join(
          ', '
        )} was aborted because the request to the data provider took more than ${(
          this.configurationService.get('REQUEST_TIMEOUT') / 1000
        ).toFixed(3)} seconds`;
      }

      this.logger.error(message);
    }

    return response;
  }

  public getTestSymbol() {
    return 'bitcoin';
  }

  public async search({
    query,
    requestTimeout = this.configurationService.get('REQUEST_TIMEOUT')
  }: GetSearchParams): Promise<LookupResponse> {
    let items: LookupItem[] = [];

    try {
      const queryParams = new URLSearchParams({
        query: this.parseSymbol(query).id
      });

      const { coins } = await this.fetchService
        .fetch(`${this.apiUrl}/search?${queryParams.toString()}`, {
          headers: this.headers,
          signal: AbortSignal.timeout(requestTimeout)
        })
        .then((res) => res.json());

      items = coins.flatMap(({ id, name }) => {
        return [DEFAULT_CURRENCY, 'EUR'].map((currency) => {
          return {
            currency,
            name,
            assetClass: AssetClass.LIQUIDITY,
            assetSubClass: AssetSubClass.CRYPTOCURRENCY,
            dataProviderInfo: this.getDataProviderInfo(),
            dataSource: this.getName(),
            symbol: currency === DEFAULT_CURRENCY ? id : `${id}-${currency}`
          };
        });
      });
    } catch (error) {
      let message = error;

      if (['AbortError', 'TimeoutError'].includes(error?.name)) {
        message = `RequestError: The operation to search for ${query} was aborted because the request to the data provider took more than ${(
          this.configurationService.get('REQUEST_TIMEOUT') / 1000
        ).toFixed(3)} seconds`;
      }

      this.logger.error(message);
    }

    return { items };
  }

  private parseSymbol(symbol: string): { currency: string; id: string } {
    // Keep existing CoinGecko IDs in USD; suffix EUR assets so their profiles
    // and market data have a distinct identity in the database and caches.
    if (symbol.endsWith('-EUR')) {
      return { currency: 'EUR', id: symbol.slice(0, -4) };
    }

    return { currency: DEFAULT_CURRENCY, id: symbol };
  }
}
