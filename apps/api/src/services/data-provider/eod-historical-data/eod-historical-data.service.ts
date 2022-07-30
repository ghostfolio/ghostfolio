import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { DataProviderInterface } from '@ghostfolio/api/services/data-provider/interfaces/data-provider.interface';
import {
  IDataProviderHistoricalResponse,
  IDataProviderResponse
} from '@ghostfolio/api/services/interfaces/interfaces';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile.service';
import { DATE_FORMAT } from '@ghostfolio/common/helper';
import { Granularity } from '@ghostfolio/common/types';
import { Injectable, Logger } from '@nestjs/common';
import { DataSource, SymbolProfile } from '@prisma/client';
import bent from 'bent';
import { format } from 'date-fns';

@Injectable()
export class EodHistoricalDataService implements DataProviderInterface {
  private apiKey: string;
  private readonly URL = 'https://eodhistoricaldata.com/api';

  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly symbolProfileService: SymbolProfileService
  ) {
    this.apiKey = this.configurationService.get('EOD_HISTORICAL_DATA_API_KEY');
  }

  public canHandle(symbol: string) {
    return true;
  }

  public async getAssetProfile(
    aSymbol: string
  ): Promise<Partial<SymbolProfile>> {
    return {
      dataSource: this.getName()
    };
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

      const [response, symbolProfiles] = await Promise.all([
        get(),
        this.symbolProfileService.getSymbolProfiles(
          aSymbols.map((symbol) => {
            return {
              symbol,
              dataSource: DataSource.EOD_HISTORICAL_DATA
            };
          })
        )
      ]);

      const quotes = aSymbols.length === 1 ? [response] : response;

      return quotes.reduce((result, item, index, array) => {
        result[item.code] = {
          currency: symbolProfiles.find((symbolProfile) => {
            return symbolProfile.symbol === item.code;
          })?.currency,
          dataSource: DataSource.EOD_HISTORICAL_DATA,
          marketPrice: item.close,
          marketState: 'delayed'
        };

        return result;
      }, {});
    } catch (error) {
      Logger.error(error, 'EodHistoricalDataService');
    }

    return {};
  }

  public async search(aQuery: string): Promise<{ items: LookupItem[] }> {
    return { items: [] };
  }
}
