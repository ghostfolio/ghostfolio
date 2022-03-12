import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { CacheService } from '@ghostfolio/api/app/cache/cache.service';
import { DataGatheringService } from '@ghostfolio/api/services/data-gathering.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile.service';
import { OrderWithAccount } from '@ghostfolio/common/types';
import { Injectable } from '@nestjs/common';
import { DataSource, Order, Prisma, Type as TypeOfOrder } from '@prisma/client';
import Big from 'big.js';
import { endOfToday, isAfter } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

import { Activity } from './interfaces/activities.interface';

@Injectable()
export class OrderService {
  public constructor(
    private readonly accountService: AccountService,
    private readonly cacheService: CacheService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly dataGatheringService: DataGatheringService,
    private readonly prismaService: PrismaService,
    private readonly symbolProfileService: SymbolProfileService
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

  public async createOrder(
    data: Prisma.OrderCreateInput & {
      accountId?: string;
      currency?: string;
      dataSource?: DataSource;
      symbol?: string;
      userId: string;
    }
  ): Promise<Order> {
    const defaultAccount = (
      await this.accountService.getAccounts(data.userId)
    ).find((account) => {
      return account.isDefault === true;
    });

    let Account = {
      connect: {
        id_userId: {
          userId: data.userId,
          id: data.accountId ?? defaultAccount?.id
        }
      }
    };

    if (data.type === 'ITEM') {
      const currency = data.SymbolProfile.connectOrCreate.create.currency;
      const dataSource: DataSource = 'MANUAL';
      const id = uuidv4();
      const name = data.SymbolProfile.connectOrCreate.create.symbol;

      Account = undefined;
      data.id = id;
      data.SymbolProfile.connectOrCreate.create.currency = currency;
      data.SymbolProfile.connectOrCreate.create.dataSource = dataSource;
      data.SymbolProfile.connectOrCreate.create.name = name;
      data.SymbolProfile.connectOrCreate.create.symbol = id;
      data.SymbolProfile.connectOrCreate.where.dataSource_symbol = {
        dataSource,
        symbol: id
      };
    } else {
      data.SymbolProfile.connectOrCreate.create.symbol =
        data.SymbolProfile.connectOrCreate.create.symbol.toUpperCase();
    }

    await this.dataGatheringService.gatherProfileData([
      {
        dataSource: data.SymbolProfile.connectOrCreate.create.dataSource,
        symbol: data.SymbolProfile.connectOrCreate.create.symbol
      }
    ]);

    const isDraft = isAfter(data.date as Date, endOfToday());

    if (!isDraft) {
      // Gather symbol data of order in the background, if not draft
      this.dataGatheringService.gatherSymbols([
        {
          dataSource: data.SymbolProfile.connectOrCreate.create.dataSource,
          date: <Date>data.date,
          symbol: data.SymbolProfile.connectOrCreate.create.symbol
        }
      ]);
    }

    await this.cacheService.flush();

    delete data.accountId;
    delete data.currency;
    delete data.dataSource;
    delete data.symbol;
    delete data.userId;

    const orderData: Prisma.OrderCreateInput = data;

    return this.prismaService.order.create({
      data: {
        ...orderData,
        Account,
        isDraft
      }
    });
  }

  public async deleteOrder(
    where: Prisma.OrderWhereUniqueInput
  ): Promise<Order> {
    const order = await this.prismaService.order.delete({
      where
    });

    if (order.type === 'ITEM') {
      await this.symbolProfileService.deleteById(order.symbolProfileId);
    }

    return order;
  }

  public async getOrders({
    includeDrafts = false,
    types,
    userCurrency,
    userId
  }: {
    includeDrafts?: boolean;
    types?: TypeOfOrder[];
    userCurrency: string;
    userId: string;
  }): Promise<Activity[]> {
    const where: Prisma.OrderWhereInput = { userId };

    if (includeDrafts === false) {
      where.isDraft = false;
    }

    if (types) {
      where.OR = types.map((type) => {
        return {
          type: {
            equals: type
          }
        };
      });
    }

    return (
      await this.orders({
        where,
        include: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          Account: {
            include: {
              Platform: true
            }
          },
          // eslint-disable-next-line @typescript-eslint/naming-convention
          SymbolProfile: true
        },
        orderBy: { date: 'asc' }
      })
    ).map((order) => {
      const value = new Big(order.quantity).mul(order.unitPrice).toNumber();

      return {
        ...order,
        value,
        feeInBaseCurrency: this.exchangeRateDataService.toCurrency(
          order.fee,
          order.SymbolProfile.currency,
          userCurrency
        ),
        valueInBaseCurrency: this.exchangeRateDataService.toCurrency(
          value,
          order.SymbolProfile.currency,
          userCurrency
        )
      };
    });
  }

  public async updateOrder({
    data,
    where
  }: {
    data: Prisma.OrderUpdateInput & {
      currency?: string;
      dataSource?: DataSource;
      symbol?: string;
    };
    where: Prisma.OrderWhereUniqueInput;
  }): Promise<Order> {
    if (data.Account.connect.id_userId.id === null) {
      delete data.Account;
    }

    let isDraft = false;

    if (data.type === 'ITEM') {
      const name = data.SymbolProfile.connect.dataSource_symbol.symbol;

      data.SymbolProfile = { update: { name } };
    } else {
      isDraft = isAfter(data.date as Date, endOfToday());

      if (!isDraft) {
        // Gather symbol data of order in the background, if not draft
        this.dataGatheringService.gatherSymbols([
          {
            dataSource: data.SymbolProfile.connect.dataSource_symbol.dataSource,
            date: <Date>data.date,
            symbol: data.SymbolProfile.connect.dataSource_symbol.symbol
          }
        ]);
      }
    }

    await this.cacheService.flush();

    delete data.currency;
    delete data.dataSource;
    delete data.symbol;

    return this.prismaService.order.update({
      data: {
        ...data,
        isDraft
      },
      where
    });
  }
}
