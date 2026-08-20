import { DateQuery } from '@ghostfolio/api/app/portfolio/interfaces/date-query.interface';
import { DataGatheringItem } from '@ghostfolio/api/services/interfaces/interfaces';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { DEFAULT_PROCESSOR_GATHER_HISTORICAL_MARKET_DATA_TIMEOUT } from '@ghostfolio/common/config';
import { getStartOfUtcDate } from '@ghostfolio/common/helper';
import { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';

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
  }: DataGatheringItem): Promise<MarketData> {
    return await this.prismaService.marketData.findFirst({
      where: {
        dataSource,
        symbol,
        date: getStartOfUtcDate(date)
      }
    });
  }

  public async getLatest({
    dataSource,
    symbol
  }: AssetProfileIdentifier): Promise<MarketData> {
    return this.prismaService.marketData.findFirst({
      orderBy: [{ date: 'desc' }],
      where: {
        dataSource,
        symbol
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
    dateQuery,
    skip,
    take
  }: {
    assetProfileIdentifiers: AssetProfileIdentifier[];
    dateQuery: DateQuery;
    skip?: number;
    take?: number;
  }): Promise<MarketData[]> {
    return this.prismaService.marketData.findMany({
      skip,
      take,
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
        OR: assetProfileIdentifiers.map(({ dataSource, symbol }) => {
          return {
            dataSource,
            symbol
          };
        })
      }
    });
  }

  public async getRangeCount({
    assetProfileIdentifiers,
    dateQuery
  }: {
    assetProfileIdentifiers: AssetProfileIdentifier[];
    dateQuery: DateQuery;
  }): Promise<number> {
    return this.prismaService.marketData.count({
      where: {
        date: dateQuery,
        OR: assetProfileIdentifiers.map(({ dataSource, symbol }) => {
          return {
            dataSource,
            symbol
          };
        })
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

  /**
   * Atomically replace market data for a symbol within a date range.
   * Deletes existing data in the range and inserts new data within a single
   * transaction to prevent data loss if the operation fails.
   */
  public async replaceForSymbol({
    data,
    dataSource,
    symbol
  }: AssetProfileIdentifier & { data: Prisma.MarketDataUpdateInput[] }) {
    const marketDataItems = data.map(({ date, marketPrice, state }) => {
      return {
        dataSource,
        symbol,
        date: getStartOfUtcDate(date as Date),
        marketPrice: marketPrice as number,
        state: state as MarketDataState
      };
    });

    await this.prismaService.$transaction(
      async (prisma) => {
        if (marketDataItems.length > 0) {
          let minTime = Infinity;
          let maxTime = -Infinity;

          for (const { date } of marketDataItems) {
            const time = date.getTime();

            if (time < minTime) {
              minTime = time;
            }

            if (time > maxTime) {
              maxTime = time;
            }
          }

          const minDate = new Date(minTime);
          const maxDate = new Date(maxTime);

          await prisma.marketData.deleteMany({
            where: {
              dataSource,
              symbol,
              date: {
                gte: minDate,
                lte: maxDate
              }
            }
          });

          await prisma.marketData.createMany({
            data: marketDataItems,
            skipDuplicates: true
          });
        }
      },
      { timeout: DEFAULT_PROCESSOR_GATHER_HISTORICAL_MARKET_DATA_TIMEOUT }
    );
  }

  public updateAssetProfileIdentifier(
    oldAssetProfileIdentifier: AssetProfileIdentifier,
    newAssetProfileIdentifier: AssetProfileIdentifier
  ) {
    return this.prismaService.marketData.updateMany({
      data: {
        dataSource: newAssetProfileIdentifier.dataSource,
        symbol: newAssetProfileIdentifier.symbol
      },
      where: {
        dataSource: oldAssetProfileIdentifier.dataSource,
        symbol: oldAssetProfileIdentifier.symbol
      }
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
        const dateOfMarketData = getStartOfUtcDate(date as Date);

        return this.prismaService.marketData.upsert({
          create: {
            dataSource: dataSource as DataSource,
            date: dateOfMarketData,
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
              date: dateOfMarketData,
              symbol: symbol as string
            }
          }
        });
      }
    );

    return this.prismaService.$transaction(upsertPromises);
  }
}
