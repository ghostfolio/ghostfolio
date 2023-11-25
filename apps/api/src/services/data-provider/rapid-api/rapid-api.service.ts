import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { DataProviderInterface } from '@ghostfolio/api/services/data-provider/interfaces/data-provider.interface';
import {
  IDataProviderHistoricalResponse,
  IDataProviderResponse
} from '@ghostfolio/api/services/interfaces/interfaces';
import {
  DEFAULT_REQUEST_TIMEOUT,
  ghostfolioFearAndGreedIndexSymbol
} from '@ghostfolio/common/config';
import { DATE_FORMAT, getYesterday } from '@ghostfolio/common/helper';
import { Granularity } from '@ghostfolio/common/types';
import { Injectable, Logger } from '@nestjs/common';
import { DataSource, SymbolProfile } from '@prisma/client';
import { format } from 'date-fns';
import got from 'got';

@Injectable()
export class RapidApiService implements DataProviderInterface {
  public constructor(
    private readonly configurationService: ConfigurationService
  ) {}

  public canHandle(symbol: string) {
    return !!this.configurationService.get('RAPID_API_API_KEY');
  }

  public async getAssetProfile(
    aSymbol: string
  ): Promise<Partial<SymbolProfile>> {
    return {
      dataSource: this.getName(),
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
    try {
      const symbol = aSymbol;

      if (symbol === ghostfolioFearAndGreedIndexSymbol) {
        const fgi = await this.getFearAndGreedIndex();

        return {
          [ghostfolioFearAndGreedIndexSymbol]: {
            [format(getYesterday(), DATE_FORMAT)]: {
              marketPrice: fgi.previousClose.value
            }
          }
        };
      }
    } catch (error) {
      throw new Error(
        `Could not get historical market data for ${aSymbol} (${this.getName()}) from ${format(
          from,
          DATE_FORMAT
        )} to ${format(to, DATE_FORMAT)}: [${error.name}] ${error.message}`
      );
    }

    return {};
  }

  public getName(): DataSource {
    return DataSource.RAPID_API;
  }

  public async getQuotes({
    requestTimeout = DEFAULT_REQUEST_TIMEOUT,
    symbols
  }: {
    requestTimeout?: number;
    symbols: string[];
  }): Promise<{ [symbol: string]: IDataProviderResponse }> {
    if (symbols.length <= 0) {
      return {};
    }

    try {
      const symbol = symbols[0];

      if (symbol === ghostfolioFearAndGreedIndexSymbol) {
        const fgi = await this.getFearAndGreedIndex();

        return {
          [ghostfolioFearAndGreedIndexSymbol]: {
            currency: undefined,
            dataSource: this.getName(),
            marketPrice: fgi.now.value,
            marketState: 'open'
          }
        };
      }
    } catch (error) {
      Logger.error(error, 'RapidApiService');
    }

    return {};
  }

  public getTestSymbol() {
    return undefined;
  }

  public async search({
    includeIndices = false,
    query
  }: {
    includeIndices?: boolean;
    query: string;
  }): Promise<{ items: LookupItem[] }> {
    return { items: [] };
  }

  private async getFearAndGreedIndex(): Promise<{
    now: { value: number; valueText: string };
    previousClose: { value: number; valueText: string };
    oneWeekAgo: { value: number; valueText: string };
    oneMonthAgo: { value: number; valueText: string };
    oneYearAgo: { value: number; valueText: string };
  }> {
    try {
      const abortController = new AbortController();

      setTimeout(() => {
        abortController.abort();
      }, DEFAULT_REQUEST_TIMEOUT);

      const { fgi } = await got(
        `https://fear-and-greed-index.p.rapidapi.com/v1/fgi`,
        {
          headers: {
            useQueryString: 'true',
            'x-rapidapi-host': 'fear-and-greed-index.p.rapidapi.com',
            'x-rapidapi-key': this.configurationService.get('RAPID_API_API_KEY')
          },
          // @ts-ignore
          signal: abortController.signal
        }
      ).json<any>();

      return fgi;
    } catch (error) {
      let message = error;

      if (error?.code === 'ABORT_ERR') {
        message = `RequestError: The operation was aborted because the request to the data provider took more than ${DEFAULT_REQUEST_TIMEOUT}ms`;
      }

      Logger.error(message, 'RapidApiService');

      return undefined;
    }
  }
}
