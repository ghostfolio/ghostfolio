import { resetHours } from '@ghostfolio/common/helper';
import { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';

import { Injectable } from '@nestjs/common';
import {
  DataSource,
  MarketData,
  MarketDataState,
  Prisma
} from '@prisma/client';

import { UpdateMarketDataDto } from '../../app/admin/update-market-data.dto';
import { DateQuery } from '../../app/portfolio/interfaces/date-query.interface';
import { IDataGatheringItem } from '../interfaces/interfaces';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MarketDataService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async deleteMany({ dataSource, symbol }: AssetProfileIdentifier) {
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

  public async getMax({ dataSource, symbol }: AssetProfileIdentifier) {
    return this.prismaService.marketData.findFirst({
      select: {
        date: true,
        marketPrice: true
      },
      orderBy: [
        {
          marketPrice: 'desc'
        }
      ],
      where: {
        dataSource,
        symbol
      }
    });
  }

  public async getRange({
    assetProfileIdentifiers,
    dateQuery
  }: {
    assetProfileIdentifiers: AssetProfileIdentifier[];
    dateQuery: DateQuery;
  }): Promise<MarketData[]> {
    return this.prismaService.marketData.findMany({
      orderBy: [
        {
          date: 'asc'
        },
        {
          symbol: 'asc'
        }
      ],
      where: {
        dataSource: {
          in: assetProfileIdentifiers.map(({ dataSource }) => {
            return dataSource;
          })
        },
        date: dateQuery,
        symbol: {
          in: assetProfileIdentifiers.map(({ symbol }) => {
            return symbol;
          })
        }
      }
    });
  }

  public async marketDataItems(params: {
    select?: Prisma.MarketDataSelectScalar;
    skip?: number;
    take?: number;
    cursor?: Prisma.MarketDataWhereUniqueInput;
    where?: Prisma.MarketDataWhereInput;
    orderBy?: Prisma.MarketDataOrderByWithRelationInput;
  }): Promise<MarketData[]> {
    const { select, skip, take, cursor, where, orderBy } = params;

    return this.prismaService.marketData.findMany({
      select,
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
            dataSource: dataSource as DataSource,
            date: date as Date,
            marketPrice: marketPrice as number,
            state: state as MarketDataState,
            symbol: symbol as string
          },
          update: {
            marketPrice: marketPrice as number,
            state: state as MarketDataState
          },
          where: {
            dataSource_date_symbol: {
              dataSource: dataSource as DataSource,
              date: date as Date,
              symbol: symbol as string
            }
          }
        });
      }
    );

    return this.prismaService.$transaction(upsertPromises);
  }
}
