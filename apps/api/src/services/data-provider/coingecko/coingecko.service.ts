import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { DataProviderInterface } from '@ghostfolio/api/services/data-provider/interfaces/data-provider.interface';
import {
  IDataProviderHistoricalResponse,
  IDataProviderResponse
} from '@ghostfolio/api/services/interfaces/interfaces';
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
import got from 'got';

@Injectable()
export class CoinGeckoService implements DataProviderInterface {
  private baseCurrency: string;
  private readonly URL = 'https://api.coingecko.com/api/v3';

  public constructor(
    private readonly configurationService: ConfigurationService
  ) {
    this.baseCurrency = this.configurationService.get('BASE_CURRENCY');
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
      currency: this.baseCurrency,
      dataSource: this.getName(),
      symbol: aSymbol
    };

    try {
      const { name } = await got(`${this.URL}/coins/${aSymbol}`).json<any>();

      response.name = name;
    } catch (error) {
      Logger.error(error, 'CoinGeckoService');
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
      const { prices } = await got(
        `${
          this.URL
        }/coins/${aSymbol}/market_chart/range?vs_currency=${this.baseCurrency.toLowerCase()}&from=${getUnixTime(
          from
        )}&to=${getUnixTime(to)}`
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

  public async getQuotes(
    aSymbols: string[]
  ): Promise<{ [symbol: string]: IDataProviderResponse }> {
    const results: { [symbol: string]: IDataProviderResponse } = {};

    if (aSymbols.length <= 0) {
      return {};
    }

    try {
      const response = await got(
        `${this.URL}/simple/price?ids=${aSymbols.join(
          ','
        )}&vs_currencies=${this.baseCurrency.toLowerCase()}`
      ).json<any>();

      for (const symbol in response) {
        if (Object.prototype.hasOwnProperty.call(response, symbol)) {
          results[symbol] = {
            currency: this.baseCurrency,
            dataProviderInfo: this.getDataProviderInfo(),
            dataSource: DataSource.COINGECKO,
            marketPrice: response[symbol][this.baseCurrency.toLowerCase()],
            marketState: 'open'
          };
        }
      }
    } catch (error) {
      Logger.error(error, 'CoinGeckoService');
    }

    return results;
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
      const { coins } = await got(
        `${this.URL}/search?query=${query}`
      ).json<any>();

      items = coins.map(({ id: symbol, name }) => {
        return {
          name,
          symbol,
          assetClass: AssetClass.CASH,
          assetSubClass: AssetSubClass.CRYPTOCURRENCY,
          currency: this.baseCurrency,
          dataSource: this.getName()
        };
      });
    } catch (error) {
      Logger.error(error, 'CoinGeckoService');
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
