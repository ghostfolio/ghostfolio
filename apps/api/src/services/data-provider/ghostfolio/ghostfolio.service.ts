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
import { PROPERTY_API_KEY_GHOSTFOLIO } from '@ghostfolio/common/config';
import {
  DataProviderInfo,
  LookupResponse
} from '@ghostfolio/common/interfaces';

import { Injectable, Logger } from '@nestjs/common';
import { DataSource, SymbolProfile } from '@prisma/client';
import got from 'got';

@Injectable()
export class GhostfolioService implements DataProviderInterface {
  private apiKey: string;
  private readonly URL = environment.production
    ? 'https://ghostfol.io/api'
    : `${this.configurationService.get('ROOT_URL')}/api`;

  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly propertyService: PropertyService
  ) {
    void this.initialize();
  }

  public async initialize() {
    this.apiKey = (await this.propertyService.getByKey(
      PROPERTY_API_KEY_GHOSTFOLIO
    )) as string;
  }

  public canHandle() {
    return true;
  }

  public async getAssetProfile({
    symbol
  }: {
    symbol: string;
  }): Promise<Partial<SymbolProfile>> {
    return {
      symbol,
      dataSource: this.getName()
    };
  }

  public getDataProviderInfo(): DataProviderInfo {
    return {
      isPremium: true,
      name: 'Ghostfolio',
      url: 'https://ghostfo.io'
    };
  }

  public async getDividends({}: GetDividendsParams) {
    return {};
  }

  public async getHistorical({}: GetHistoricalParams): Promise<{
    [symbol: string]: { [date: string]: IDataProviderHistoricalResponse };
  }> {
    // TODO
    return {};
  }

  public getMaxNumberOfSymbolsPerRequest() {
    return 20;
  }

  public getName(): DataSource {
    return DataSource.GHOSTFOLIO;
  }

  public async getQuotes({}: GetQuotesParams): Promise<{
    [symbol: string]: IDataProviderResponse;
  }> {
    // TODO
    return {};
  }

  public getTestSymbol() {
    return 'AAPL.US';
  }

  public async search({ query }: GetSearchParams): Promise<LookupResponse> {
    let searchResult: LookupResponse = { items: [] };

    try {
      const abortController = new AbortController();

      setTimeout(() => {
        abortController.abort();
      }, this.configurationService.get('REQUEST_TIMEOUT'));

      searchResult = await got(
        `${this.URL}/v1/data-providers/ghostfolio/lookup?query=${query}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`
          },
          // @ts-ignore
          signal: abortController.signal
        }
      ).json<any>();
    } catch (error) {
      let message = error;

      if (error?.code === 'ABORT_ERR') {
        message = `RequestError: The operation to search for ${query} was aborted because the request to the data provider took more than ${this.configurationService.get(
          'REQUEST_TIMEOUT'
        )}ms`;
      }

      Logger.error(message, 'GhostfolioService');
    }

    return searchResult;
  }
}
