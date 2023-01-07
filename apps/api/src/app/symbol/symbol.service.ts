import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import {
  IDataGatheringItem,
  IDataProviderHistoricalResponse
} from '@ghostfolio/api/services/interfaces/interfaces';
import { MarketDataService } from '@ghostfolio/api/services/market-data.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile.service';
import { DATE_FORMAT, parseDate } from '@ghostfolio/common/helper';
import {
  HistoricalDataItem,
  ImportResponse
} from '@ghostfolio/common/interfaces';
import { Injectable, Logger } from '@nestjs/common';
import { SymbolProfile } from '@prisma/client';
import { format, subDays, subYears } from 'date-fns';

import { LookupItem } from './interfaces/lookup-item.interface';
import { SymbolItem } from './interfaces/symbol-item.interface';

@Injectable()
export class SymbolService {
  public constructor(
    private readonly dataProviderService: DataProviderService,
    private readonly marketDataService: MarketDataService,
    private readonly symbolProfileService: SymbolProfileService
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

    if (dataGatheringItem.dataSource && marketPrice >= 0) {
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
        dataSource: dataGatheringItem.dataSource,
        symbol: dataGatheringItem.symbol
      };
    }

    return undefined;
  }

  public async getDividends({
    dataSource,
    symbol
  }: IDataGatheringItem): Promise<ImportResponse> {
    try {
      const date = new Date();

      const [[assetProfile], historicalData] = await Promise.all([
        this.symbolProfileService.getSymbolProfiles([
          {
            dataSource,
            symbol
          }
        ]),
        await this.dataProviderService.getDividends({
          dataSource,
          symbol,
          from: subYears(date, 5),
          granularity: 'day',
          to: date
        })
      ]);

      return {
        activities: Object.entries(historicalData).map(
          ([dateString, historicalDataItem]) => {
            return {
              accountId: undefined,
              accountUserId: undefined,
              comment: undefined,
              createdAt: undefined,
              date: parseDate(dateString),
              fee: 0,
              feeInBaseCurrency: 0,
              id: assetProfile.id,
              isDraft: false,
              quantity: 0,
              SymbolProfile: <SymbolProfile>(<unknown>assetProfile),
              symbolProfileId: undefined,
              type: 'DIVIDEND',
              unitPrice: historicalDataItem.marketPrice,
              updatedAt: undefined,
              userId: undefined,
              value: 0,
              valueInBaseCurrency: 0
            };
          }
        )
      };
    } catch {
      return { activities: [] };
    }
  }

  public async getForDate({
    dataSource,
    date = new Date(),
    symbol
  }: IDataGatheringItem): Promise<IDataProviderHistoricalResponse> {
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
