import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { DataProviderInterface } from '@ghostfolio/api/services/data-provider/interfaces/data-provider.interface';
import {
  IDataProviderHistoricalResponse,
  IDataProviderResponse
} from '@ghostfolio/api/services/interfaces/interfaces';
import {
  DEFAULT_CURRENCY,
  DEFAULT_REQUEST_TIMEOUT
} from '@ghostfolio/common/config';
import { DATE_FORMAT, parseDate } from '@ghostfolio/common/helper';
import { DataProviderInfo } from '@ghostfolio/common/interfaces';
import { Granularity } from '@ghostfolio/common/types';
import { Injectable, Logger } from '@nestjs/common';
import { DataSource, SymbolProfile } from '@prisma/client';
import { format, isAfter, isBefore, isSameDay } from 'date-fns';
import got from 'got';

@Injectable()
export class FinancialModelingPrepService implements DataProviderInterface {
  private apiKey: string;
  private readonly URL = 'https://financialmodelingprep.com/api/v3';

  public constructor(
    private readonly configurationService: ConfigurationService
  ) {
    this.apiKey = this.configurationService.get(
      'FINANCIAL_MODELING_PREP_API_KEY'
    );
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
      const abortController = new AbortController();

      setTimeout(() => {
        abortController.abort();
      }, DEFAULT_REQUEST_TIMEOUT);

      const { historical } = await got(
        `${this.URL}/historical-price-full/${aSymbol}?apikey=${this.apiKey}`,
        {
          // @ts-ignore
          signal: abortController.signal
        }
      ).json<any>();

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

  public async getQuotes({
    requestTimeout = DEFAULT_REQUEST_TIMEOUT,
    symbols
  }: {
    requestTimeout?: number;
    symbols: string[];
  }): Promise<{ [symbol: string]: IDataProviderResponse }> {
    const response: { [symbol: string]: IDataProviderResponse } = {};

    if (symbols.length <= 0) {
      return response;
    }

    try {
      const abortController = new AbortController();

      setTimeout(() => {
        abortController.abort();
      }, requestTimeout);

      const quotes = await got(
        `${this.URL}/quote/${symbols.join(',')}?apikey=${this.apiKey}`,
        {
          // @ts-ignore
          signal: abortController.signal
        }
      ).json<any>();

      for (const { price, symbol } of quotes) {
        response[symbol] = {
          currency: DEFAULT_CURRENCY,
          dataProviderInfo: this.getDataProviderInfo(),
          dataSource: DataSource.FINANCIAL_MODELING_PREP,
          marketPrice: price,
          marketState: 'delayed'
        };
      }
    } catch (error) {
      let message = error;

      if (error?.code === 'ABORT_ERR') {
        message = `RequestError: The operation was aborted because the request to the data provider took more than ${DEFAULT_REQUEST_TIMEOUT}ms`;
      }

      Logger.error(message, 'FinancialModelingPrepService');
    }

    return response;
  }

  public getTestSymbol() {
    return 'AAPL';
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
      const abortController = new AbortController();

      setTimeout(() => {
        abortController.abort();
      }, DEFAULT_REQUEST_TIMEOUT);

      const result = await got(
        `${this.URL}/search?query=${query}&apikey=${this.apiKey}`,
        {
          // @ts-ignore
          signal: abortController.signal
        }
      ).json<any>();

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
      let message = error;

      if (error?.code === 'ABORT_ERR') {
        message = `RequestError: The operation was aborted because the request to the data provider took more than ${DEFAULT_REQUEST_TIMEOUT}ms`;
      }

      Logger.error(message, 'FinancialModelingPrepService');
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
