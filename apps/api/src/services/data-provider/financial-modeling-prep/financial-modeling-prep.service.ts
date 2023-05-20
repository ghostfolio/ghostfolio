import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { DataProviderInterface } from '@ghostfolio/api/services/data-provider/interfaces/data-provider.interface';
import {
  IDataProviderHistoricalResponse,
  IDataProviderResponse
} from '@ghostfolio/api/services/interfaces/interfaces';
import { DATE_FORMAT, parseDate } from '@ghostfolio/common/helper';
import { DataProviderInfo } from '@ghostfolio/common/interfaces';
import { Granularity } from '@ghostfolio/common/types';
import { Injectable, Logger } from '@nestjs/common';
import { DataSource, SymbolProfile } from '@prisma/client';
import bent from 'bent';
import { format, isAfter, isBefore, isSameDay } from 'date-fns';

@Injectable()
export class FinancialModelingPrepService implements DataProviderInterface {
  private apiKey: string;
  private baseCurrency: string;
  private readonly URL = 'https://financialmodelingprep.com/api/v3';

  public constructor(
    private readonly configurationService: ConfigurationService
  ) {
    this.apiKey = this.configurationService.get(
      'FINANCIAL_MODELING_PREP_API_KEY'
    );
    this.baseCurrency = this.configurationService.get('BASE_CURRENCY');
  }

  public canHandle(symbol: string) {
    return true;
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
      const get = bent(
        `${this.URL}/historical-price-full/${aSymbol}?apikey=${this.apiKey}`,
        'GET',
        'json',
        200
      );
      const { historical } = await get();

      const result: {
        [symbol: string]: { [date: string]: IDataProviderHistoricalResponse };
      } = {
        [aSymbol]: {}
      };

      for (const { close, date } of historical) {
        if (
          (isSameDay(parseDate(date), from) ||
            isAfter(parseDate(date), from)) &&
          isBefore(parseDate(date), to)
        ) {
          result[aSymbol][date] = {
            marketPrice: close
          };
        }
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

  public getName(): DataSource {
    return DataSource.FINANCIAL_MODELING_PREP;
  }

  public async getQuotes(
    aSymbols: string[]
  ): Promise<{ [symbol: string]: IDataProviderResponse }> {
    const results: { [symbol: string]: IDataProviderResponse } = {};

    if (aSymbols.length <= 0) {
      return {};
    }

    try {
      const get = bent(
        `${this.URL}/quote/${aSymbols.join(',')}?apikey=${this.apiKey}`,
        'GET',
        'json',
        200
      );
      const response = await get();

      for (const { price, symbol } of response) {
        results[symbol] = {
          currency: this.baseCurrency,
          dataProviderInfo: this.getDataProviderInfo(),
          dataSource: DataSource.FINANCIAL_MODELING_PREP,
          marketPrice: price,
          marketState: 'delayed'
        };
      }
    } catch (error) {
      Logger.error(error, 'FinancialModelingPrepService');
    }

    return results;
  }

  public getTestSymbol() {
    return 'AAPL';
  }

  public async search(aQuery: string): Promise<{ items: LookupItem[] }> {
    let items: LookupItem[] = [];

    try {
      const get = bent(
        `${this.URL}/search?query=${aQuery}&apikey=${this.apiKey}`,
        'GET',
        'json',
        200
      );
      const result = await get();

      items = result.map(({ currency, name, symbol }) => {
        return {
          // TODO: Add assetClass
          // TODO: Add assetSubClass
          currency,
          name,
          symbol,
          dataSource: this.getName()
        };
      });
    } catch (error) {
      Logger.error(error, 'FinancialModelingPrepService');
    }

    return { items };
  }

  private getDataProviderInfo(): DataProviderInfo {
    return {
      name: 'Financial Modeling Prep',
      url: 'https://financialmodelingprep.com/developer/docs'
    };
  }
}
