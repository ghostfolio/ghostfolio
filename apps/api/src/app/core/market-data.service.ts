import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { resetHours } from '@ghostfolio/common/helper';
import { Injectable } from '@nestjs/common';
import { MarketData } from '@prisma/client';
import { DateQuery } from './interfaces/date-query.interface';

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
        symbol,
        date: resetHours(date)
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
