import { HistoricalDataItem } from '@ghostfolio/api/app/portfolio/interfaces/portfolio-position-detail.interface';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import {
  IDataGatheringItem,
  IDataProviderHistoricalResponse
} from '@ghostfolio/api/services/interfaces/interfaces';
import { MarketDataService } from '@ghostfolio/api/services/market-data.service';
import { DATE_FORMAT } from '@ghostfolio/common/helper';
import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from '@prisma/client';
import { format, subDays } from 'date-fns';

import { LookupItem } from './interfaces/lookup-item.interface';
import { SymbolItem } from './interfaces/symbol-item.interface';

@Injectable()
export class SymbolService {
  public constructor(
    private readonly dataProviderService: DataProviderService,
    private readonly marketDataService: MarketDataService
  ) {}

  public async get({
    dataGatheringItem,
    includeHistoricalData
  }: {
    dataGatheringItem: IDataGatheringItem;
    includeHistoricalData?: number;
  }): Promise<SymbolItem> {
    const quotes = await this.dataProviderService.getQuotes([
      dataGatheringItem
    ]);
    const { currency, marketPrice } = quotes[dataGatheringItem.symbol] ?? {};

    if (dataGatheringItem.dataSource && marketPrice) {
      let historicalData: HistoricalDataItem[] = [];

      if (includeHistoricalData > 0) {
        const days = includeHistoricalData;

        const marketData = await this.marketDataService.getRange({
          dateQuery: { gte: subDays(new Date(), days) },
          symbols: [dataGatheringItem.symbol]
        });

        historicalData = marketData.map(({ date, marketPrice: value }) => {
          return {
            value,
            date: date.toISOString()
          };
        });
      }

      return {
        currency,
        historicalData,
        marketPrice,
        dataSource: dataGatheringItem.dataSource
      };
    }

    return undefined;
  }

  public async getForDate({
    dataSource,
    date,
    symbol
  }: {
    dataSource: DataSource;
    date: Date;
    symbol: string;
  }): Promise<IDataProviderHistoricalResponse> {
    const historicalData = await this.dataProviderService.getHistoricalRaw(
      [{ dataSource, symbol }],
      date,
      date
    );

    return {
      marketPrice:
        historicalData?.[symbol]?.[format(date, DATE_FORMAT)]?.marketPrice
    };
  }

  public async lookup(aQuery: string): Promise<{ items: LookupItem[] }> {
    const results: { items: LookupItem[] } = { items: [] };

    if (!aQuery) {
      return results;
    }

    try {
      const { items } = await this.dataProviderService.search(aQuery);
      results.items = items;
      return results;
    } catch (error) {
      Logger.error(error, 'SymbolService');

      throw error;
    }
  }
}
