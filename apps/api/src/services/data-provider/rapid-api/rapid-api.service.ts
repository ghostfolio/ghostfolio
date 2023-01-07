import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { DataProviderInterface } from '@ghostfolio/api/services/data-provider/interfaces/data-provider.interface';
import {
  IDataProviderHistoricalResponse,
  IDataProviderResponse
} from '@ghostfolio/api/services/interfaces/interfaces';
import { ghostfolioFearAndGreedIndexSymbol } from '@ghostfolio/common/config';
import { DATE_FORMAT, getYesterday } from '@ghostfolio/common/helper';
import { Granularity } from '@ghostfolio/common/types';
import { Injectable, Logger } from '@nestjs/common';
import { DataSource, SymbolProfile } from '@prisma/client';
import bent from 'bent';
import { format } from 'date-fns';

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
      dataSource: this.getName()
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

  public async getQuotes(
    aSymbols: string[]
  ): Promise<{ [symbol: string]: IDataProviderResponse }> {
    if (aSymbols.length <= 0) {
      return {};
    }

    try {
      const symbol = aSymbols[0];

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

  public async search(aQuery: string): Promise<{ items: LookupItem[] }> {
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
      const get = bent(
        `https://fear-and-greed-index.p.rapidapi.com/v1/fgi`,
        'GET',
        'json',
        200,
        {
          useQueryString: true,
          'x-rapidapi-host': 'fear-and-greed-index.p.rapidapi.com',
          'x-rapidapi-key': this.configurationService.get('RAPID_API_API_KEY')
        }
      );

      const { fgi } = await get();
      return fgi;
    } catch (error) {
      Logger.error(error, 'RapidApiService');

      return undefined;
    }
  }
}
