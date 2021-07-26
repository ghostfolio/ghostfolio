import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { resetHours } from '@ghostfolio/common/helper';
import { Injectable } from '@nestjs/common';
import { MarketData } from '@prisma/client';

@Injectable()
export class MarketDataService {
  public constructor(private prisma: PrismaService) {}

  public async get({
    date,
    symbol
  }: {
    date: Date;
    symbol: string;
  }): Promise<MarketData> {
    return await this.prisma.marketData.findFirst({
      where: {
        date: resetHours(date),
        symbol
      }
    });
  }

  public async getRange({
    dateQuery,
    symbols
  }: {
    dateQuery: DateQuery;
    symbols: string[];
  }): Promise<MarketData[]> {
    return await this.prisma.marketData.findMany({
      orderBy: [
        {
          date: 'asc'
        },
        {
          symbol: 'asc'
        }
      ],
      where: {
        date: dateQuery,
        symbol: {
          in: symbols
        }
      }
    });
  }
}

export interface DateQuery {
  gte?: Date;
  lt?: Date;
  in?: Date[];
}
