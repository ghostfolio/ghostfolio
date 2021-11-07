import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { IDataGatheringItem } from '@ghostfolio/api/services/interfaces/interfaces';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from '@prisma/client';

import { LookupItem } from './interfaces/lookup-item.interface';
import { SymbolItem } from './interfaces/symbol-item.interface';

@Injectable()
export class SymbolService {
  public constructor(
    private readonly dataProviderService: DataProviderService,
    private readonly prismaService: PrismaService
  ) {}

  public async get(dataGatheringItem: IDataGatheringItem): Promise<SymbolItem> {
    const response = await this.dataProviderService.get([dataGatheringItem]);
    const { currency, marketPrice } = response[dataGatheringItem.symbol] ?? {};

    if (dataGatheringItem.dataSource && marketPrice) {
      return {
        currency,
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
