import { DataGatheringService } from '@ghostfolio/api/services/data-gathering.service';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { OrderWithAccount } from '@ghostfolio/helper/types';
import { Injectable } from '@nestjs/common';
import { Order, Prisma } from '@prisma/client';

import { CacheService } from '../cache/cache.service';
import { RedisCacheService } from '../redis-cache/redis-cache.service';

@Injectable()
export class OrderService {
  public constructor(
    private readonly cacheService: CacheService,
    private readonly dataGatheringService: DataGatheringService,
    private readonly redisCacheService: RedisCacheService,
    private prisma: PrismaService
  ) {}

  public async order(
    orderWhereUniqueInput: Prisma.OrderWhereUniqueInput
  ): Promise<Order | null> {
    return this.prisma.order.findUnique({
      where: orderWhereUniqueInput
    });
  }

  public async orders(params: {
    include?: Prisma.OrderInclude;
    skip?: number;
    take?: number;
    cursor?: Prisma.OrderWhereUniqueInput;
    where?: Prisma.OrderWhereInput;
    orderBy?: Prisma.OrderOrderByInput;
  }): Promise<OrderWithAccount[]> {
    const { include, skip, take, cursor, where, orderBy } = params;

    return this.prisma.order.findMany({
      cursor,
      include,
      orderBy,
      skip,
      take,
      where
    });
  }

  public async createOrder(
    data: Prisma.OrderCreateInput,
    aUserId: string
  ): Promise<Order> {
    this.redisCacheService.remove(`${aUserId}.portfolio`);

    // Gather symbol data of order in the background
    this.dataGatheringService.gatherSymbols([
      {
        date: <Date>data.date,
        symbol: data.symbol
      }
    ]);

    await this.cacheService.flush(aUserId);

    return this.prisma.order.create({
      data
    });
  }

  public async deleteOrder(
    where: Prisma.OrderWhereUniqueInput,
    aUserId: string
  ): Promise<Order> {
    this.redisCacheService.remove(`${aUserId}.portfolio`);

    return this.prisma.order.delete({
      where
    });
  }

  public async updateOrder(
    params: {
      where: Prisma.OrderWhereUniqueInput;
      data: Prisma.OrderUpdateInput;
    },
    aUserId: string
  ): Promise<Order> {
    const { data, where } = params;

    this.redisCacheService.remove(`${aUserId}.portfolio`);

    // Gather symbol data of order in the background
    this.dataGatheringService.gatherSymbols([
      {
        date: <Date>data.date,
        symbol: <string>data.symbol
      }
    ]);

    await this.cacheService.flush(aUserId);

    return this.prisma.order.update({
      data,
      where
    });
  }
}
