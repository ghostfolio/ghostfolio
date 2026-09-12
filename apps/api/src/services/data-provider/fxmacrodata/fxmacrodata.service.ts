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
import { DATE_FORMAT, isCurrencySymbol } from '@ghostfolio/common/helper';
import {
  DataProviderHistoricalResponse,
  DataProviderInfo,
  DataProviderResponse,
  LookupResponse
} from '@ghostfolio/common/interfaces';

import { Injectable, Logger } from '@nestjs/common';
import { AssetClass, DataSource, SymbolProfile } from '@prisma/client';
import { format } from 'date-fns';

import {
  FXMacroDataForexResponse,
  FXMacroDataSourcesResponse
} from './interfaces/interfaces';

@Injectable()
export class FXMacroDataService implements DataProviderInterface {
  private readonly baseUrl = 'https://api.fxmacrodata.com/v1';
  private readonly logger = new Logger(FXMacroDataService.name);

  private currencies: string[];

  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly fetchService: FetchService
  ) {}

  /**
   * FXMacroData publishes official reference rates, so this provider handles
   * currency pairs only. Any other symbol is left to the other providers.
   */
  public canHandle(symbol?: string) {
    if (!this.configurationService.get('API_KEY_FXMACRODATA')) {
      return false;
    }

    return symbol ? isCurrencySymbol(symbol) : true;
  }

  public async getAssetProfile({
    symbol
  }: GetAssetProfileParams): Promise<Partial<SymbolProfile>> {
    const { base, quote } = this.splitCurrencyPair(symbol);

    if (!base || !quote) {
      return { symbol, dataSource: this.getName() };
    }

    return {
      symbol,
      assetClass: AssetClass.LIQUIDITY,
      currency: quote,
      dataSource: this.getName(),
      name: `${base}/${quote}`
    };
  }

  public getDataProviderInfo(): DataProviderInfo {
    return {
      dataSource: DataSource.FXMACRODATA,
      isPremium: true,
      name: 'FXMacroData',
      url: 'https://fxmacrodata.com'
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
    const { base, quote } = this.splitCurrencyPair(symbol);

    if (!base || !quote) {
      return {};
    }

    try {
      const response: { [date: string]: DataProviderHistoricalResponse } = {};

      // The endpoint caps a page at 100 rows and orders most-recent-first, so
      // longer ranges are walked page by page rather than silently truncated.
      for (let page = 1; ; page++) {
        const { data } = await this.get<FXMacroDataForexResponse>({
          requestTimeout,
          path: `forex/${base.toLowerCase()}/${quote.toLowerCase()}`,
          searchParams: {
            end_date: format(to, DATE_FORMAT),
            limit: '100',
            page: page.toString(),
            start_date: format(from, DATE_FORMAT)
          }
        });

        if (!data?.length) {
          break;
        }

        for (const { date, val } of data) {
          // val is documented as anyOf[number, null]; a missing rate must not
          // become a zero market price.
          if (date && typeof val === 'number') {
            response[date] = { marketPrice: val };
          }
        }

        if (data.length < 100) {
          break;
        }
      }

      return response;
    } catch (error) {
      throw new Error(
        `Could not get historical market data for ${symbol} (${this.getName()}) from ${format(
          from,
          DATE_FORMAT
        )} to ${format(to, DATE_FORMAT)}: [${error.name}] ${error.message}`
      );
    }
  }

  public getName(): DataSource {
    return DataSource.FXMACRODATA;
  }

  public async getQuotes({
    requestTimeout = this.configurationService.get('REQUEST_TIMEOUT'),
    symbols
  }: GetQuotesParams): Promise<{ [symbol: string]: DataProviderResponse }> {
    const response: { [symbol: string]: DataProviderResponse } = {};

    if (!symbols.length) {
      return response;
    }

    const results = await Promise.all(
      symbols.map(async (symbol) => {
        const { base, quote } = this.splitCurrencyPair(symbol);

        if (!base || !quote) {
          return undefined;
        }

        try {
          const { data } = await this.get<FXMacroDataForexResponse>({
            requestTimeout,
            path: `forex/${base.toLowerCase()}/${quote.toLowerCase()}`,
            searchParams: { limit: '1' }
          });

          const [latest] = data ?? [];

          if (typeof latest?.val !== 'number') {
            return undefined;
          }

          return { currency: quote, marketPrice: latest.val, symbol };
        } catch (error) {
          // One unavailable pair must not lose the rates of the others.
          this.logger.error(
            `Could not get quote for ${symbol} (${this.getName()}): [${error.name}] ${error.message}`
          );

          return undefined;
        }
      })
    );

    for (const result of results) {
      if (result) {
        response[result.symbol] = {
          currency: result.currency,
          dataSource: this.getName(),
          marketPrice: result.marketPrice,
          marketState: 'open'
        };
      }
    }

    return response;
  }

  public getTestSymbol() {
    return `EUR${DEFAULT_CURRENCY}`;
  }

  public async search({ query }: GetSearchParams): Promise<LookupResponse> {
    const currencies = await this.getCoveredCurrencies();
    const normalizedQuery = query.trim().toUpperCase().replace('/', '');

    if (!normalizedQuery) {
      return { items: [] };
    }

    const items = currencies
      .flatMap((base) => {
        return currencies
          .filter((quote) => {
            return quote !== base;
          })
          .map((quote) => {
            return { base, quote, symbol: `${base}${quote}` };
          });
      })
      .filter(({ symbol }) => {
        return symbol.includes(normalizedQuery);
      })
      .map(({ base, quote, symbol }) => {
        return {
          symbol,
          assetClass: AssetClass.LIQUIDITY,
          assetSubClass: undefined,
          currency: quote,
          dataProviderInfo: this.getDataProviderInfo(),
          dataSource: this.getName(),
          name: `${base}/${quote}`
        };
      });

    return { items };
  }

  /**
   * The currencies FXMacroData covers. A pair is available whenever both of its
   * currencies are covered: the API stores each pair in one direction only and
   * derives the inverse or the cross itself, so the covered set - not the list
   * of stored pairs - is what determines availability.
   */
  private async getCoveredCurrencies(): Promise<string[]> {
    if (this.currencies) {
      return this.currencies;
    }

    try {
      const { sources } = await this.get<FXMacroDataSourcesResponse>({
        path: 'fx/sources',
        requestTimeout: this.configurationService.get('REQUEST_TIMEOUT')
      });

      const currencies = new Set<string>();

      for (const { served_pairs } of sources ?? []) {
        for (const pair of served_pairs ?? []) {
          const [base, quote] = pair.split('/');

          if (base && quote) {
            currencies.add(base.toUpperCase());
            currencies.add(quote.toUpperCase());
          }
        }
      }

      this.currencies = [...currencies].sort();
    } catch (error) {
      this.logger.error(
        `Could not get the covered currencies (${this.getName()}): [${error.name}] ${error.message}`
      );

      return [];
    }

    return this.currencies;
  }

  private async get<T>({
    path,
    requestTimeout,
    searchParams = {}
  }: {
    path: string;
    requestTimeout: number;
    searchParams?: { [key: string]: string };
  }): Promise<T> {
    const url = `${this.baseUrl}/${path}?${new URLSearchParams(searchParams).toString()}`;

    const response = await this.fetchService.fetch(url, {
      // The key travels in a header rather than a query parameter so it is not
      // written to request logs or a proxy's access log.
      headers: {
        'X-API-Key': this.configurationService.get('API_KEY_FXMACRODATA')
      },
      signal: AbortSignal.timeout(requestTimeout)
    });

    if (!response.ok) {
      throw new Error(`${url.split('?')[0]} returned HTTP ${response.status}`);
    }

    return (await response.json()) as T;
  }

  private splitCurrencyPair(symbol: string): {
    base?: string;
    quote?: string;
  } {
    if (!isCurrencySymbol(symbol)) {
      return {};
    }

    return {
      base: symbol.substring(0, symbol.length - DEFAULT_CURRENCY.length),
      quote: symbol.substring(symbol.length - DEFAULT_CURRENCY.length)
    };
  }
}
