import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { Injectable } from '@nestjs/common';
import { MarketData } from '@prisma/client';
import { subDays } from 'date-fns';

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
        date: {
          gte: subDays(date, 1),
          lt: date
        },
        symbol
      }
    });
  }
}
