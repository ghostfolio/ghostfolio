import { HistoricalDataItem } from '@ghostfolio/api/app/portfolio/interfaces/portfolio-position-detail.interface';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { IDataGatheringItem } from '@ghostfolio/api/services/interfaces/interfaces';
import { MarketDataService } from '@ghostfolio/api/services/market-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from '@prisma/client';
import { subDays } from 'date-fns';

import { LookupItem } from './interfaces/lookup-item.interface';
import { SymbolItem } from './interfaces/symbol-item.interface';

@Injectable()
export class SymbolService {
  public constructor(
    private readonly dataProviderService: DataProviderService,
    private readonly marketDataService: MarketDataService,
    private readonly prismaService: PrismaService
  ) {}

  public async get({
    dataGatheringItem,
    includeHistoricalData = false
  }: {
    dataGatheringItem: IDataGatheringItem;
    includeHistoricalData?: boolean;
  }): Promise<SymbolItem> {
    const response = await this.dataProviderService.get([dataGatheringItem]);
    const { currency, marketPrice } = response[dataGatheringItem.symbol] ?? {};

    if (dataGatheringItem.dataSource && marketPrice) {
      let historicalData: HistoricalDataItem[];

      if (includeHistoricalData) {
        const days = 7;

        const marketData = await this.marketDataService.getRange({
          dateQuery: { gte: subDays(new Date(), days) },
          symbols: [dataGatheringItem.symbol]
        });

        historicalData = marketData.map(({ date, marketPrice }) => {
          return {
            date: date.toISOString(),
            value: marketPrice
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

  public async lookup(aQuery: string): Promise<{ items: LookupItem[] }> {
    const results: { items: LookupItem[] } = { items: [] };

    if (!aQuery) {
      return results;
    }

    try {
      const { items } = await this.dataProviderService.search(aQuery);
      results.items = items;

      // Add custom symbols
      const ghostfolioSymbolProfiles =
        await this.prismaService.symbolProfile.findMany({
          select: {
            currency: true,
            dataSource: true,
            name: true,
            symbol: true
          },
          where: {
            AND: [
              {
                dataSource: DataSource.GHOSTFOLIO,
                name: {
                  startsWith: aQuery
                }
              }
            ]
          }
        });

      for (const ghostfolioSymbolProfile of ghostfolioSymbolProfiles) {
        results.items.push(ghostfolioSymbolProfile);
      }

      return results;
    } catch (error) {
      Logger.error(error);

      throw error;
    }
  }
}
