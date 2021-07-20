import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { resetHours } from '@ghostfolio/common/helper';
import { Injectable } from '@nestjs/common';
import { MarketData } from '@prisma/client';
import { endOfDay } from 'date-fns';

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
    dateRangeEnd,
    dateRangeStart,
    symbols
  }: {
    dateRangeEnd: Date;
    dateRangeStart: Date;
    symbols: string[];
  }): Promise<MarketData[]> {
    return await this.prisma.marketData.findMany({
      where: {
        date: {
          gte: dateRangeStart,
          lt: endOfDay(dateRangeEnd)
        },
        symbol: {
          in: symbols
        }
      }
    });
  }
}
