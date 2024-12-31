import { environment } from '@ghostfolio/api/environments/environment';
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
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import {
  HEADER_KEY_TOKEN,
  PROPERTY_API_KEY_GHOSTFOLIO
} from '@ghostfolio/common/config';
import { DATE_FORMAT } from '@ghostfolio/common/helper';
import {
  DataProviderInfo,
  DividendsResponse,
  HistoricalResponse,
  LookupResponse,
  QuotesResponse
} from '@ghostfolio/common/interfaces';

import { Injectable, Logger } from '@nestjs/common';
import { DataSource, SymbolProfile } from '@prisma/client';
import { format } from 'date-fns';
import { StatusCodes } from 'http-status-codes';

@Injectable()
export class GhostfolioService implements DataProviderInterface {
  private readonly URL = environment.production
    ? 'https://ghostfol.io/api'
    : `${this.configurationService.get('ROOT_URL')}/api`;

  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly propertyService: PropertyService
  ) {}

  public canHandle() {
    return true;
  }

  public async getAssetProfile({
    symbol
  }: {
    symbol: string;
  }): Promise<Partial<SymbolProfile>> {
    const { items } = await this.search({ query: symbol });
    const searchResult = items?.[0];

    return {
      symbol,
      assetClass: searchResult?.assetClass,
      assetSubClass: searchResult?.assetSubClass,
      currency: searchResult?.currency,
      dataSource: this.getName(),
      name: searchResult?.name
    };
  }

  public getDataProviderInfo(): DataProviderInfo {
    return {
      isPremium: true,
      name: 'Ghostfolio',
      url: 'https://ghostfo.io'
    };
  }

  public async getDividends({
    from,
    granularity = 'day',
    requestTimeout = this.configurationService.get('REQUEST_TIMEOUT'),
    symbol,
    to
  }: GetDividendsParams): Promise<{
    [date: string]: IDataProviderHistoricalResponse;
  }> {
    let response: {
      [date: string]: IDataProviderHistoricalResponse;
    } = {};

    try {
      const { dividends } = (await fetch(
        `${this.URL}/v2/data-providers/ghostfolio/dividends/${symbol}?from=${format(from, DATE_FORMAT)}&granularity=${granularity}&to=${format(
          to,
          DATE_FORMAT
        )}`,
        {
          headers: await this.getRequestHeaders(),
          signal: AbortSignal.timeout(requestTimeout)
        }
      ).then((res) => res.json())) as DividendsResponse;

      response = dividends;
    } catch (error) {
      let message = error;

      if (error.response?.statusCode === StatusCodes.TOO_MANY_REQUESTS) {
        message = 'RequestError: The daily request limit has been exceeded';
      } else if (error.response?.statusCode === StatusCodes.UNAUTHORIZED) {
        if (!error.request?.options?.headers?.authorization?.includes('-')) {
          message =
            'RequestError: The provided API key is invalid. Please update it in the Settings section of the Admin Control panel.';
        } else {
          message =
            'RequestError: The provided API key has expired. Please request a new one and update it in the Settings section of the Admin Control panel.';
        }
      }

      Logger.error(message, 'GhostfolioService');
    }

    return response;
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
    try {
      const { historicalData } = (await fetch(
        `${this.URL}/v2/data-providers/ghostfolio/historical/${symbol}?from=${format(from, DATE_FORMAT)}&granularity=${granularity}&to=${format(
          to,
          DATE_FORMAT
        )}`,
        {
          headers: await this.getRequestHeaders(),
          signal: AbortSignal.timeout(requestTimeout)
        }
      ).then((res) => res.json())) as HistoricalResponse;

      return {
        [symbol]: historicalData
      };
    } catch (error) {
      let message = error;

      if (error.response?.statusCode === StatusCodes.TOO_MANY_REQUESTS) {
        message = 'RequestError: The daily request limit has been exceeded';
      } else if (error.response?.statusCode === StatusCodes.UNAUTHORIZED) {
        if (!error.request?.options?.headers?.authorization?.includes('-')) {
          message =
            'RequestError: The provided API key is invalid. Please update it in the Settings section of the Admin Control panel.';
        } else {
          message =
            'RequestError: The provided API key has expired. Please request a new one and update it in the Settings section of the Admin Control panel.';
        }
      }

      Logger.error(message, 'GhostfolioService');

      throw new Error(
        `Could not get historical market data for ${symbol} (${this.getName()}) from ${format(
          from,
          DATE_FORMAT
        )} to ${format(to, DATE_FORMAT)}: [${error.name}] ${error.message}`
      );
    }
  }

  public getMaxNumberOfSymbolsPerRequest() {
    return 20;
  }

  public getName(): DataSource {
    return DataSource.GHOSTFOLIO;
  }

  public async getQuotes({
    requestTimeout = this.configurationService.get('REQUEST_TIMEOUT'),
    symbols
  }: GetQuotesParams): Promise<{
    [symbol: string]: IDataProviderResponse;
  }> {
    let response: { [symbol: string]: IDataProviderResponse } = {};

    if (symbols.length <= 0) {
      return response;
    }

    try {
      const { quotes } = (await fetch(
        `${this.URL}/v2/data-providers/ghostfolio/quotes?symbols=${symbols.join(',')}`,
        {
          headers: await this.getRequestHeaders(),
          signal: AbortSignal.timeout(requestTimeout)
        }
      ).then((res) => res.json())) as QuotesResponse;

      response = quotes;
    } catch (error) {
      let message = error;

      if (error.name === 'AbortError') {
        message = `RequestError: The operation to get the quotes was aborted because the request to the data provider took more than ${(
          this.configurationService.get('REQUEST_TIMEOUT') / 1000
        ).toFixed(3)} seconds`;
      } else if (error.response?.statusCode === StatusCodes.TOO_MANY_REQUESTS) {
        message = 'RequestError: The daily request limit has been exceeded';
      } else if (error.response?.statusCode === StatusCodes.UNAUTHORIZED) {
        if (!error.request?.options?.headers?.authorization?.includes('-')) {
          message =
            'RequestError: The provided API key is invalid. Please update it in the Settings section of the Admin Control panel.';
        } else {
          message =
            'RequestError: The provided API key has expired. Please request a new one and update it in the Settings section of the Admin Control panel.';
        }
      }

      Logger.error(message, 'GhostfolioService');
    }

    return response;
  }

  public getTestSymbol() {
    return 'AAPL.US';
  }

  public async search({ query }: GetSearchParams): Promise<LookupResponse> {
    let searchResult: LookupResponse = { items: [] };

    try {
      searchResult = (await fetch(
        `${this.URL}/v2/data-providers/ghostfolio/lookup?query=${query}`,
        {
          headers: await this.getRequestHeaders(),
          signal: AbortSignal.timeout(
            this.configurationService.get('REQUEST_TIMEOUT')
          )
        }
      ).then((res) => res.json())) as LookupResponse;
    } catch (error) {
      let message = error;

      if (error.name === 'AbortError') {
        message = `RequestError: The operation to search for ${query} was aborted because the request to the data provider took more than ${(
          this.configurationService.get('REQUEST_TIMEOUT') / 1000
        ).toFixed(3)} seconds`;
      } else if (error.response?.statusCode === StatusCodes.TOO_MANY_REQUESTS) {
        message = 'RequestError: The daily request limit has been exceeded';
      } else if (error.response?.statusCode === StatusCodes.UNAUTHORIZED) {
        if (!error.request?.options?.headers?.authorization?.includes('-')) {
          message =
            'RequestError: The provided API key is invalid. Please update it in the Settings section of the Admin Control panel.';
        } else {
          message =
            'RequestError: The provided API key has expired. Please request a new one and update it in the Settings section of the Admin Control panel.';
        }
      }

      Logger.error(message, 'GhostfolioService');
    }

    return searchResult;
  }

  private async getRequestHeaders() {
    const apiKey = (await this.propertyService.getByKey(
      PROPERTY_API_KEY_GHOSTFOLIO
    )) as string;

    return {
      [HEADER_KEY_TOKEN]: `Api-Key ${apiKey}`
    };
  }
}
