import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { Injectable } from '@nestjs/common';
import { MarketData } from '@prisma/client';
import { addDays } from 'date-fns';

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
        // Filter for given date
        date: {
          gte: date,
          lt: addDays(date, 1)
        },
        symbol
      }
    });
  }
}
