import { UpdateMarketDataDto } from '@ghostfolio/api/app/admin/update-market-data.dto';
import { DateQuery } from '@ghostfolio/api/app/portfolio/interfaces/date-query.interface';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { resetHours } from '@ghostfolio/common/helper';
import { Injectable } from '@nestjs/common';
import { DataSource, MarketData, Prisma } from '@prisma/client';

@Injectable()
export class MarketDataService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async get({
    date,
    symbol
  }: {
    date: Date;
    symbol: string;
  }): Promise<MarketData> {
    return await this.prismaService.marketData.findFirst({
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
    return await this.prismaService.marketData.findMany({
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

  public async marketDataItems(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.MarketDataWhereUniqueInput;
    where?: Prisma.MarketDataWhereInput;
    orderBy?: Prisma.MarketDataOrderByWithRelationInput;
  }): Promise<MarketData[]> {
    const { skip, take, cursor, where, orderBy } = params;

    return this.prismaService.marketData.findMany({
      cursor,
      orderBy,
      skip,
      take,
      where
    });
  }

  public async updateMarketData(params: {
    data: { dataSource: DataSource } & UpdateMarketDataDto;
    where: Prisma.MarketDataWhereUniqueInput;
  }): Promise<MarketData> {
    const { data, where } = params;

    return this.prismaService.marketData.upsert({
      where,
      create: {
        dataSource: data.dataSource,
        date: where.date_symbol.date,
        marketPrice: data.marketPrice,
        symbol: where.date_symbol.symbol
      },
      update: { marketPrice: data.marketPrice }
    });
  }
}
