import { UpdateMarketDataDto } from '@ghostfolio/api/app/admin/update-market-data.dto';
import { DateQuery } from '@ghostfolio/api/app/portfolio/interfaces/date-query.interface';
import { IDataGatheringItem } from '@ghostfolio/api/services/interfaces/interfaces';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { resetHours } from '@ghostfolio/common/helper';
import { UniqueAsset } from '@ghostfolio/common/interfaces';
import { Injectable } from '@nestjs/common';
import {
  DataSource,
  MarketData,
  MarketDataState,
  Prisma
} from '@prisma/client';

@Injectable()
export class MarketDataService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async deleteMany({ dataSource, symbol }: UniqueAsset) {
    return this.prismaService.marketData.deleteMany({
      where: {
        dataSource,
        symbol
      }
    });
  }

  public async get({
    dataSource,
    date = new Date(),
    symbol
  }: IDataGatheringItem): Promise<MarketData> {
    return await this.prismaService.marketData.findFirst({
      where: {
        dataSource,
        symbol,
        date: resetHours(date)
      }
    });
  }

  public async getMax({ dataSource, symbol }: UniqueAsset): Promise<number> {
    const aggregations = await this.prismaService.marketData.aggregate({
      _max: {
        marketPrice: true
      },
      where: {
        dataSource,
        symbol
      }
    });

    return aggregations._max.marketPrice;
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
    data: {
      state: MarketDataState;
    } & UpdateMarketDataDto;
    where: Prisma.MarketDataWhereUniqueInput;
  }): Promise<MarketData> {
    const { data, where } = params;

    return this.prismaService.marketData.upsert({
      where,
      create: {
        dataSource: where.dataSource_date_symbol.dataSource,
        date: where.dataSource_date_symbol.date,
        marketPrice: data.marketPrice,
        state: data.state,
        symbol: where.dataSource_date_symbol.symbol
      },
      update: { marketPrice: data.marketPrice, state: data.state }
    });
  }

  /**
   * Upsert market data by imitating missing upsertMany functionality
   * with $transaction
   */
  public async updateMany({
    data
  }: {
    data: Prisma.MarketDataUpdateInput[];
  }): Promise<MarketData[]> {
    const upsertPromises = data.map(
      ({ dataSource, date, marketPrice, symbol, state }) => {
        return this.prismaService.marketData.upsert({
          create: {
            dataSource: <DataSource>dataSource,
            date: <Date>date,
            marketPrice: <number>marketPrice,
            state: <MarketDataState>state,
            symbol: <string>symbol
          },
          update: {
            marketPrice: <number>marketPrice,
            state: <MarketDataState>state
          },
          where: {
            dataSource_date_symbol: {
              dataSource: <DataSource>dataSource,
              date: <Date>date,
              symbol: <string>symbol
            }
          }
        });
      }
    );

    return this.prismaService.$transaction(upsertPromises);
  }
}
