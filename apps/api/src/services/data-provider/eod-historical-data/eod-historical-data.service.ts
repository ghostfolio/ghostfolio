import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { DataProviderInterface } from '@ghostfolio/api/services/data-provider/interfaces/data-provider.interface';
import {
  IDataProviderHistoricalResponse,
  IDataProviderResponse
} from '@ghostfolio/api/services/interfaces/interfaces';
import { DATE_FORMAT } from '@ghostfolio/common/helper';
import { Granularity } from '@ghostfolio/common/types';
import { Injectable, Logger } from '@nestjs/common';
import {
  AssetClass,
  AssetSubClass,
  DataSource,
  SymbolProfile
} from '@prisma/client';
import bent from 'bent';
import { format, isToday } from 'date-fns';

@Injectable()
export class EodHistoricalDataService implements DataProviderInterface {
  private apiKey: string;
  private readonly URL = 'https://eodhistoricaldata.com/api';

  public constructor(
    private readonly configurationService: ConfigurationService
  ) {
    this.apiKey = this.configurationService.get('EOD_HISTORICAL_DATA_API_KEY');
  }

  public canHandle(symbol: string) {
    return true;
  }

  public async getAssetProfile(
    aSymbol: string
  ): Promise<Partial<SymbolProfile>> {
    const [searchResult] = await this.getSearchResult(aSymbol);

    return {
      assetClass: searchResult?.assetClass,
      assetSubClass: searchResult?.assetSubClass,
      currency: searchResult?.currency,
      dataSource: this.getName(),
      isin: searchResult?.isin,
      name: searchResult?.name,
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
      const get = bent(
        `${this.URL}/eod/${aSymbol}?api_token=${
          this.apiKey
        }&fmt=json&from=${format(from, DATE_FORMAT)}&to=${format(
          to,
          DATE_FORMAT
        )}&period={aGranularity}`,
        'GET',
        'json',
        200
      );

      const response = await get();

      return response.reduce(
        (result, historicalItem, index, array) => {
          result[aSymbol][historicalItem.date] = {
            marketPrice: historicalItem.close,
            performance: historicalItem.open - historicalItem.close
          };

          return result;
        },
        { [aSymbol]: {} }
      );
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
    // It is not recommended using more than 15-20 tickers per request
    // https://eodhistoricaldata.com/financial-apis/live-realtime-stocks-api
    return 20;
  }

  public getName(): DataSource {
    return DataSource.EOD_HISTORICAL_DATA;
  }

  public async getQuotes(
    aSymbols: string[]
  ): Promise<{ [symbol: string]: IDataProviderResponse }> {
    if (aSymbols.length <= 0) {
      return {};
    }

    try {
      const get = bent(
        `${this.URL}/real-time/${aSymbols[0]}?api_token=${
          this.apiKey
        }&fmt=json&s=${aSymbols.join(',')}`,
        'GET',
        'json',
        200
      );

      const [realTimeResponse, searchResponse] = await Promise.all([
        get(),
        this.search(aSymbols[0])
      ]);

      const quotes =
        aSymbols.length === 1 ? [realTimeResponse] : realTimeResponse;

      return quotes.reduce(
        (
          result: { [symbol: string]: IDataProviderResponse },
          { close, code, timestamp }
        ) => {
          result[code] = {
            currency: searchResponse?.items[0]?.currency,
            dataSource: DataSource.EOD_HISTORICAL_DATA,
            marketPrice: close,
            marketState: isToday(new Date(timestamp * 1000)) ? 'open' : 'closed'
          };

          return result;
        },
        {}
      );
    } catch (error) {
      Logger.error(error, 'EodHistoricalDataService');
    }

    return {};
  }

  public async search(aQuery: string): Promise<{ items: LookupItem[] }> {
    const searchResult = await this.getSearchResult(aQuery);

    return {
      items: searchResult
        .filter(({ symbol }) => {
          return !symbol.toLowerCase().endsWith('forex');
        })
        .map(
          ({
            assetClass,
            assetSubClass,
            currency,
            dataSource,
            name,
            symbol
          }) => {
            return {
              assetClass,
              assetSubClass,
              currency,
              dataSource,
              name,
              symbol
            };
          }
        )
    };
  }

  private async getSearchResult(aQuery: string): Promise<
    (LookupItem & {
      assetClass: AssetClass;
      assetSubClass: AssetSubClass;
      isin: string;
    })[]
  > {
    let searchResult = [];

    try {
      const get = bent(
        `${this.URL}/search/${aQuery}?api_token=${this.apiKey}`,
        'GET',
        'json',
        200
      );
      const response = await get();

      searchResult = response.map(
        ({
          Code,
          Currency: currency,
          Exchange,
          ISIN: isin,
          Name: name,
          Type
        }) => {
          const { assetClass, assetSubClass } = this.parseAssetClass({
            Exchange,
            Type
          });

          return {
            assetClass,
            assetSubClass,
            currency,
            isin,
            name,
            dataSource: this.getName(),
            symbol: `${Code}.${Exchange}`
          };
        }
      );
    } catch (error) {
      Logger.error(error, 'EodHistoricalDataService');
    }

    return searchResult;
  }

  private parseAssetClass({
    Exchange,
    Type
  }: {
    Exchange: string;
    Type: string;
  }): {
    assetClass: AssetClass;
    assetSubClass: AssetSubClass;
  } {
    let assetClass: AssetClass;
    let assetSubClass: AssetSubClass;

    switch (Type?.toLowerCase()) {
      case 'common stock':
        assetClass = AssetClass.EQUITY;
        assetSubClass = AssetSubClass.STOCK;
        break;
      case 'currency':
        assetClass = AssetClass.CASH;

        if (Exchange?.toLowerCase() === 'cc') {
          assetSubClass = AssetSubClass.CRYPTOCURRENCY;
        }

        break;
      case 'etf':
        assetClass = AssetClass.EQUITY;
        assetSubClass = AssetSubClass.ETF;
        break;
    }

    return { assetClass, assetSubClass };
  }
}
