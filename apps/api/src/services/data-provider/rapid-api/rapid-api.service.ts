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
import { ghostfolioFearAndGreedIndexSymbol } from '@ghostfolio/common/config';
import { DATE_FORMAT, getYesterday } from '@ghostfolio/common/helper';
import {
  DataProviderInfo,
  LookupResponse
} from '@ghostfolio/common/interfaces';

import { Injectable, Logger } from '@nestjs/common';
import { DataSource, SymbolProfile } from '@prisma/client';
import { format } from 'date-fns';

@Injectable()
export class RapidApiService implements DataProviderInterface {
  public constructor(
    private readonly configurationService: ConfigurationService
  ) {}

  public canHandle() {
    return !!this.configurationService.get('API_KEY_RAPID_API');
  }

  public async getAssetProfile({
    symbol
  }: GetAssetProfileParams): Promise<Partial<SymbolProfile>> {
    return {
      symbol,
      dataSource: this.getName()
    };
  }

  public getDataProviderInfo(): DataProviderInfo {
    return {
      dataSource: DataSource.RAPID_API,
      isPremium: false,
      name: 'Rapid API',
      url: 'https://rapidapi.com'
    };
  }

  public async getDividends({}: GetDividendsParams) {
    return {};
  }

  public async getHistorical({
    from,
    symbol,
    to
  }: GetHistoricalParams): Promise<{
    [symbol: string]: { [date: string]: IDataProviderHistoricalResponse };
  }> {
    try {
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
        `Could not get historical market data for ${symbol} (${this.getName()}) from ${format(
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
    symbols
  }: GetQuotesParams): Promise<{ [symbol: string]: IDataProviderResponse }> {
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

  public async search({}: GetSearchParams): Promise<LookupResponse> {
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
      const { fgi } = await fetch(
        `https://fear-and-greed-index.p.rapidapi.com/v1/fgi`,
        {
          headers: {
            useQueryString: 'true',
            'x-rapidapi-host': 'fear-and-greed-index.p.rapidapi.com',
            'x-rapidapi-key': this.configurationService.get('API_KEY_RAPID_API')
          },
          signal: AbortSignal.timeout(
            this.configurationService.get('REQUEST_TIMEOUT')
          )
        }
      ).then((res) => res.json());

      return fgi;
    } catch (error) {
      let message = error;

      if (error?.name === 'AbortError') {
        message = `RequestError: The operation was aborted because the request to the data provider took more than ${(
          this.configurationService.get('REQUEST_TIMEOUT') / 1000
        ).toFixed(3)} seconds`;
      }

      Logger.error(message, 'RapidApiService');

      return undefined;
    }
  }
}
