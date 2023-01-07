import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import { DataProviderInterface } from '@ghostfolio/api/services/data-provider/interfaces/data-provider.interface';
import {
  IDataProviderHistoricalResponse,
  IDataProviderResponse
} from '@ghostfolio/api/services/interfaces/interfaces';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile.service';
import { Granularity } from '@ghostfolio/common/types';
import { Injectable, Logger } from '@nestjs/common';
import { DataSource, SymbolProfile } from '@prisma/client';

@Injectable()
export class ManualService implements DataProviderInterface {
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly symbolProfileService: SymbolProfileService
  ) {}

  public canHandle(symbol: string) {
    return false;
  }

  public async getAssetProfile(
    aSymbol: string
  ): Promise<Partial<SymbolProfile>> {
    return {
      dataSource: this.getName()
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
    return {};
  }

  public getName(): DataSource {
    return DataSource.MANUAL;
  }

  public async getQuotes(
    aSymbols: string[]
  ): Promise<{ [symbol: string]: IDataProviderResponse }> {
    const response: { [symbol: string]: IDataProviderResponse } = {};

    if (aSymbols.length <= 0) {
      return response;
    }

    try {
      const symbolProfiles =
        await this.symbolProfileService.getSymbolProfilesBySymbols(aSymbols);

      const marketData = await this.prismaService.marketData.findMany({
        distinct: ['symbol'],
        orderBy: {
          date: 'desc'
        },
        take: aSymbols.length,
        where: {
          symbol: {
            in: aSymbols
          }
        }
      });

      for (const symbolProfile of symbolProfiles) {
        response[symbolProfile.symbol] = {
          currency: symbolProfile.currency,
          dataSource: this.getName(),
          marketPrice:
            marketData.find((marketDataItem) => {
              return marketDataItem.symbol === symbolProfile.symbol;
            })?.marketPrice ?? 0,
          marketState: 'delayed'
        };
      }

      return response;
    } catch (error) {
      Logger.error(error, 'ManualService');
    }

    return {};
  }

  public async search(aQuery: string): Promise<{ items: LookupItem[] }> {
    const items = await this.prismaService.symbolProfile.findMany({
      select: {
        currency: true,
        dataSource: true,
        name: true,
        symbol: true
      },
      where: {
        OR: [
          {
            dataSource: this.getName(),
            name: {
              mode: 'insensitive',
              startsWith: aQuery
            }
          },
          {
            dataSource: this.getName(),
            symbol: {
              mode: 'insensitive',
              startsWith: aQuery
            }
          }
        ]
      }
    });

    return { items };
  }
}
