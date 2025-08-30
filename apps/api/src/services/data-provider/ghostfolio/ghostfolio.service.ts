import { environment } from '@ghostfolio/api/environments/environment';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import {
  DataProviderInterface,
  GetAssetProfileParams,
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
  DataProviderGhostfolioAssetProfileResponse,
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
    requestTimeout = this.configurationService.get('REQUEST_TIMEOUT'),
    symbol
  }: GetAssetProfileParams): Promise<Partial<SymbolProfile>> {
    let assetProfile: DataProviderGhostfolioAssetProfileResponse;

    try {
      const response = await fetch(
        `${this.URL}/v1/data-providers/ghostfolio/asset-profile/${symbol}`,
        {
          headers: await this.getRequestHeaders(),
          signal: AbortSignal.timeout(requestTimeout)
        }
      );

      if (!response.ok) {
        throw new Response(await response.text(), {
          status: response.status,
          statusText: response.statusText
        });
      }

      assetProfile =
        (await response.json()) as DataProviderGhostfolioAssetProfileResponse;
    } catch (error) {
      let message = error;

      if (['AbortError', 'TimeoutError'].includes(error?.name)) {
        message = `RequestError: The operation to get the asset profile for ${symbol} was aborted because the request to the data provider took more than ${(
          requestTimeout / 1000
        ).toFixed(3)} seconds`;
      } else if (error?.status === StatusCodes.TOO_MANY_REQUESTS) {
        message = 'RequestError: The daily request limit has been exceeded';
      } else if (
        [StatusCodes.FORBIDDEN, StatusCodes.UNAUTHORIZED].includes(
          error?.status
        )
      ) {
        message =
          'RequestError: The API key is invalid. Please update it in the Settings section of the Admin Control panel.';
      }

      Logger.error(message, 'GhostfolioService');
    }

    return assetProfile;
  }

  public getDataProviderInfo(): DataProviderInfo {
    return {
      dataSource: DataSource.GHOSTFOLIO,
      isPremium: true,
      name: 'Ghostfolio',
      url: 'https://ghostfol.io'
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
    let dividends: {
      [date: string]: IDataProviderHistoricalResponse;
    } = {};

    try {
      const response = await fetch(
        `${this.URL}/v2/data-providers/ghostfolio/dividends/${symbol}?from=${format(from, DATE_FORMAT)}&granularity=${granularity}&to=${format(
          to,
          DATE_FORMAT
        )}`,
        {
          headers: await this.getRequestHeaders(),
          signal: AbortSignal.timeout(requestTimeout)
        }
      );

      if (!response.ok) {
        throw new Response(await response.text(), {
          status: response.status,
          statusText: response.statusText
        });
      }

      dividends = ((await response.json()) as DividendsResponse).dividends;
    } catch (error) {
      let message = error;

      if (error?.status === StatusCodes.TOO_MANY_REQUESTS) {
        message = 'RequestError: The daily request limit has been exceeded';
      } else if (
        [StatusCodes.FORBIDDEN, StatusCodes.UNAUTHORIZED].includes(
          error?.status
        )
      ) {
        message =
          'RequestError: The API key is invalid. Please update it in the Settings section of the Admin Control panel.';
      }

      Logger.error(message, 'GhostfolioService');
    }

    return dividends;
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
      const response = await fetch(
        `${this.URL}/v2/data-providers/ghostfolio/historical/${symbol}?from=${format(from, DATE_FORMAT)}&granularity=${granularity}&to=${format(
          to,
          DATE_FORMAT
        )}`,
        {
          headers: await this.getRequestHeaders(),
          signal: AbortSignal.timeout(requestTimeout)
        }
      );

      if (!response.ok) {
        throw new Response(await response.text(), {
          status: response.status,
          statusText: response.statusText
        });
      }

      const { historicalData } = (await response.json()) as HistoricalResponse;

      return {
        [symbol]: historicalData
      };
    } catch (error) {
      if (error?.status === StatusCodes.TOO_MANY_REQUESTS) {
        error.name = 'RequestError';
        error.message =
          'RequestError: The daily request limit has been exceeded';
      } else if (
        [StatusCodes.FORBIDDEN, StatusCodes.UNAUTHORIZED].includes(
          error?.status
        )
      ) {
        error.name = 'RequestError';
        error.message =
          'RequestError: The API key is invalid. Please update it in the Settings section of the Admin Control panel.';
      }

      Logger.error(error.message, 'GhostfolioService');

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
    let quotes: { [symbol: string]: IDataProviderResponse } = {};

    if (symbols.length <= 0) {
      return quotes;
    }

    try {
      const response = await fetch(
        `${this.URL}/v2/data-providers/ghostfolio/quotes?symbols=${symbols.join(',')}`,
        {
          headers: await this.getRequestHeaders(),
          signal: AbortSignal.timeout(requestTimeout)
        }
      );

      if (!response.ok) {
        throw new Response(await response.text(), {
          status: response.status,
          statusText: response.statusText
        });
      }

      quotes = ((await response.json()) as QuotesResponse).quotes;
    } catch (error) {
      let message = error;

      if (['AbortError', 'TimeoutError'].includes(error?.name)) {
        message = `RequestError: The operation to get the quotes for ${symbols.join(
          ', '
        )} was aborted because the request to the data provider took more than ${(
          requestTimeout / 1000
        ).toFixed(3)} seconds`;
      } else if (error?.status === StatusCodes.TOO_MANY_REQUESTS) {
        message = 'RequestError: The daily request limit has been exceeded';
      } else if (
        [StatusCodes.FORBIDDEN, StatusCodes.UNAUTHORIZED].includes(
          error?.status
        )
      ) {
        message =
          'RequestError: The API key is invalid. Please update it in the Settings section of the Admin Control panel.';
      }

      Logger.error(message, 'GhostfolioService');
    }

    return quotes;
  }

  public getTestSymbol() {
    return 'AAPL';
  }

  public async search({
    query,
    requestTimeout = this.configurationService.get('REQUEST_TIMEOUT')
  }: GetSearchParams): Promise<LookupResponse> {
    let searchResult: LookupResponse = { items: [] };

    try {
      const response = await fetch(
        `${this.URL}/v2/data-providers/ghostfolio/lookup?query=${query}`,
        {
          headers: await this.getRequestHeaders(),
          signal: AbortSignal.timeout(requestTimeout)
        }
      );

      if (!response.ok) {
        throw new Response(await response.text(), {
          status: response.status,
          statusText: response.statusText
        });
      }

      searchResult = (await response.json()) as LookupResponse;
    } catch (error) {
      let message = error;

      if (['AbortError', 'TimeoutError'].includes(error?.name)) {
        message = `RequestError: The operation to search for ${query} was aborted because the request to the data provider took more than ${(
          requestTimeout / 1000
        ).toFixed(3)} seconds`;
      } else if (error?.status === StatusCodes.TOO_MANY_REQUESTS) {
        message = 'RequestError: The daily request limit has been exceeded';
      } else if (
        [StatusCodes.FORBIDDEN, StatusCodes.UNAUTHORIZED].includes(
          error?.status
        )
      ) {
        message =
          'RequestError: The API key is invalid. Please update it in the Settings section of the Admin Control panel.';
      }

      Logger.error(message, 'GhostfolioService');
    }

    return searchResult;
  }

  private async getRequestHeaders() {
    const apiKey = await this.propertyService.getByKey<string>(
      PROPERTY_API_KEY_GHOSTFOLIO
    );

    return {
      [HEADER_KEY_TOKEN]: `Api-Key ${apiKey}`
    };
  }
}
