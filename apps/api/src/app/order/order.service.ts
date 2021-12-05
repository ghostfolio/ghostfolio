import { CacheService } from '@ghostfolio/api/app/cache/cache.service';
import { DataGatheringService } from '@ghostfolio/api/services/data-gathering.service';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { OrderWithAccount } from '@ghostfolio/common/types';
import { Injectable } from '@nestjs/common';
import { DataSource, Order, Prisma } from '@prisma/client';
import { endOfToday, isAfter } from 'date-fns';

@Injectable()
export class OrderService {
  public constructor(
    private readonly cacheService: CacheService,
    private readonly dataGatheringService: DataGatheringService,
    private readonly prismaService: PrismaService
  ) {}

  public async order(
    orderWhereUniqueInput: Prisma.OrderWhereUniqueInput
  ): Promise<Order | null> {
    return this.prismaService.order.findUnique({
      where: orderWhereUniqueInput
    });
  }

  public async orders(params: {
    include?: Prisma.OrderInclude;
    skip?: number;
    take?: number;
    cursor?: Prisma.OrderWhereUniqueInput;
    where?: Prisma.OrderWhereInput;
    orderBy?: Prisma.OrderOrderByWithRelationInput;
  }): Promise<OrderWithAccount[]> {
    const { include, skip, take, cursor, where, orderBy } = params;

    return this.prismaService.order.findMany({
      cursor,
      include,
      orderBy,
      skip,
      take,
      where
    });
  }

  public async createOrder(data: Prisma.OrderCreateInput): Promise<Order> {
    const isDraft = isAfter(data.date as Date, endOfToday());

    // Convert the symbol to uppercase to avoid case-sensitive duplicates
    const symbol = data.symbol.toUpperCase();

    if (!isDraft) {
      // Gather symbol data of order in the background, if not draft
      this.dataGatheringService.gatherSymbols([
        {
          symbol,
          dataSource: data.dataSource,
          date: <Date>data.date
        }
      ]);
    }

    this.dataGatheringService.gatherProfileData([
      { symbol, dataSource: data.dataSource }
    ]);

    await this.cacheService.flush();

    return this.prismaService.order.create({
      data: {
        ...data,
        isDraft,
        symbol
      }
    });
  }

  public async deleteOrder(
    where: Prisma.OrderWhereUniqueInput
  ): Promise<Order> {
    return this.prismaService.order.delete({
      where
    });
  }

  public getOrders({
    includeDrafts = false,
    userId
  }: {
    includeDrafts?: boolean;
    userId: string;
  }) {
    const where: Prisma.OrderWhereInput = { userId };

    if (includeDrafts === false) {
      where.isDraft = false;
    }

    return this.orders({
      where,
      include: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Account: true,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        SymbolProfile: true
      },
      orderBy: { date: 'asc' }
    });
  }

  public async updateOrder(params: {
    where: Prisma.OrderWhereUniqueInput;
    data: Prisma.OrderUpdateInput;
  }): Promise<Order> {
    const { data, where } = params;

    const isDraft = isAfter(data.date as Date, endOfToday());

    if (!isDraft) {
      // Gather symbol data of order in the background, if not draft
      this.dataGatheringService.gatherSymbols([
        {
          dataSource: <DataSource>data.dataSource,
          date: <Date>data.date,
          symbol: <string>data.symbol
        }
      ]);
    }

    await this.cacheService.flush();

    return this.prismaService.order.update({
      data: {
        ...data,
        isDraft
      },
      where
    });
  }
}
