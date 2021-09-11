import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { Injectable } from '@nestjs/common';
import { Currency, DataSource } from '@prisma/client';

import { LookupItem } from './interfaces/lookup-item.interface';
import { SymbolItem } from './interfaces/symbol-item.interface';

@Injectable()
export class SymbolService {
  public constructor(
    private readonly dataProviderService: DataProviderService,
    private readonly prismaService: PrismaService
  ) {}

  public async get(aSymbol: string): Promise<SymbolItem> {
    const response = await this.dataProviderService.get([aSymbol]);
    const { currency, dataSource, marketPrice } = response[aSymbol] ?? {};

    if (dataSource && marketPrice) {
      return {
        dataSource,
        marketPrice,
        currency: <Currency>(<unknown>currency)
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
      console.error(error);

      throw error;
    }
  }
}
