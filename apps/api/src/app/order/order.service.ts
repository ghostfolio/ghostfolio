import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { DataGatheringService } from '@ghostfolio/api/services/data-gathering/data-gathering.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import {
  GATHER_ASSET_PROFILE_PROCESS,
  GATHER_ASSET_PROFILE_PROCESS_OPTIONS
} from '@ghostfolio/common/config';
import { getAssetProfileIdentifier } from '@ghostfolio/common/helper';
import { Filter } from '@ghostfolio/common/interfaces';
import { OrderWithAccount } from '@ghostfolio/common/types';
import { Injectable } from '@nestjs/common';
import {
  AssetClass,
  AssetSubClass,
  DataSource,
  Order,
  Prisma,
  Tag,
  Type as TypeOfOrder
} from '@prisma/client';
import Big from 'big.js';
import { endOfToday, isAfter } from 'date-fns';
import { groupBy } from 'lodash';
import { v4 as uuidv4 } from 'uuid';

import { Activities, Activity } from './interfaces/activities.interface';

@Injectable()
export class OrderService {
  public constructor(
    private readonly accountService: AccountService,
    private readonly dataGatheringService: DataGatheringService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
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
    orderBy?: Prisma.Enumerable<Prisma.OrderOrderByWithRelationInput>;
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
      assetClass?: AssetClass;
      assetSubClass?: AssetSubClass;
      currency?: string;
      dataSource?: DataSource;
      symbol?: string;
      tags?: Tag[];
      updateAccountBalance?: boolean;
      userId: string;
    }
  ): Promise<Order> {
    let Account;

    if (data.accountId) {
      Account = {
        connect: {
          id_userId: {
            userId: data.userId,
            id: data.accountId
          }
        }
      };
    }

    const accountId = data.accountId;
    let currency = data.currency;
    const tags = data.tags ?? [];
    const updateAccountBalance = data.updateAccountBalance ?? false;
    const userId = data.userId;

    if (
      data.type === 'FEE' ||
      data.type === 'INTEREST' ||
      data.type === 'ITEM' ||
      data.type === 'LIABILITY'
    ) {
      const assetClass = data.assetClass;
      const assetSubClass = data.assetSubClass;
      currency = data.SymbolProfile.connectOrCreate.create.currency;
      const dataSource: DataSource = 'MANUAL';
      const id = uuidv4();
      const name = data.SymbolProfile.connectOrCreate.create.symbol;

      data.id = id;
      data.SymbolProfile.connectOrCreate.create.assetClass = assetClass;
      data.SymbolProfile.connectOrCreate.create.assetSubClass = assetSubClass;
      data.SymbolProfile.connectOrCreate.create.currency = currency;
      data.SymbolProfile.connectOrCreate.create.dataSource = dataSource;
      data.SymbolProfile.connectOrCreate.create.name = name;
      data.SymbolProfile.connectOrCreate.create.symbol = id;
      data.SymbolProfile.connectOrCreate.where.dataSource_symbol = {
        dataSource,
        symbol: id
      };
    }

    if (data.SymbolProfile.connectOrCreate.create.dataSource !== 'MANUAL') {
      this.dataGatheringService.addJobToQueue({
        data: {
          dataSource: data.SymbolProfile.connectOrCreate.create.dataSource,
          symbol: data.SymbolProfile.connectOrCreate.create.symbol
        },
        name: GATHER_ASSET_PROFILE_PROCESS,
        opts: {
          ...GATHER_ASSET_PROFILE_PROCESS_OPTIONS,
          jobId: getAssetProfileIdentifier({
            dataSource: data.SymbolProfile.connectOrCreate.create.dataSource,
            symbol: data.SymbolProfile.connectOrCreate.create.symbol
          })
        }
      });
    }

    delete data.accountId;
    delete data.assetClass;
    delete data.assetSubClass;

    if (!data.comment) {
      delete data.comment;
    }

    delete data.currency;
    delete data.dataSource;
    delete data.symbol;
    delete data.tags;
    delete data.updateAccountBalance;
    delete data.userId;

    const orderData: Prisma.OrderCreateInput = data;

    const isDraft =
      data.type === 'FEE' ||
      data.type === 'INTEREST' ||
      data.type === 'ITEM' ||
      data.type === 'LIABILITY'
        ? false
        : isAfter(data.date as Date, endOfToday());

    const order = await this.prismaService.order.create({
      data: {
        ...orderData,
        Account,
        isDraft,
        tags: {
          connect: tags.map(({ id }) => {
            return { id };
          })
        }
      }
    });

    if (updateAccountBalance === true) {
      let amount = new Big(data.unitPrice)
        .mul(data.quantity)
        .plus(data.fee)
        .toNumber();

      if (data.type === 'BUY') {
        amount = new Big(amount).mul(-1).toNumber();
      }

      await this.accountService.updateAccountBalance({
        accountId,
        amount,
        currency,
        userId,
        date: data.date as Date
      });
    }

    return order;
  }

  public async deleteOrder(
    where: Prisma.OrderWhereUniqueInput
  ): Promise<Order> {
    const order = await this.prismaService.order.delete({
      where
    });

    if (
      order.type === 'FEE' ||
      order.type === 'INTEREST' ||
      order.type === 'ITEM' ||
      order.type === 'LIABILITY'
    ) {
      await this.symbolProfileService.deleteById(order.symbolProfileId);
    }

    return order;
  }

  public async deleteOrders(where: Prisma.OrderWhereInput): Promise<number> {
    const { count } = await this.prismaService.order.deleteMany({
      where
    });

    return count;
  }

  public async getOrders({
    filters,
    includeDrafts = false,
    skip,
    sortColumn,
    sortDirection,
    take = Number.MAX_SAFE_INTEGER,
    types,
    userCurrency,
    userId,
    withExcludedAccounts = false
  }: {
    filters?: Filter[];
    includeDrafts?: boolean;
    skip?: number;
    sortColumn?: string;
    sortDirection?: Prisma.SortOrder;
    take?: number;
    types?: TypeOfOrder[];
    userCurrency: string;
    userId: string;
    withExcludedAccounts?: boolean;
  }): Promise<Activities> {
    let orderBy: Prisma.Enumerable<Prisma.OrderOrderByWithRelationInput> = [
      { date: 'asc' }
    ];
    const where: Prisma.OrderWhereInput = { userId };

    const {
      ACCOUNT: filtersByAccount,
      ASSET_CLASS: filtersByAssetClass,
      TAG: filtersByTag
    } = groupBy(filters, (filter) => {
      return filter.type;
    });

    if (filtersByAccount?.length > 0) {
      where.accountId = {
        in: filtersByAccount.map(({ id }) => {
          return id;
        })
      };
    }

    if (includeDrafts === false) {
      where.isDraft = false;
    }

    if (filtersByAssetClass?.length > 0) {
      where.SymbolProfile = {
        OR: [
          {
            AND: [
              {
                OR: filtersByAssetClass.map(({ id }) => {
                  return { assetClass: AssetClass[id] };
                })
              },
              {
                OR: [
                  { SymbolProfileOverrides: { is: null } },
                  { SymbolProfileOverrides: { assetClass: null } }
                ]
              }
            ]
          },
          {
            SymbolProfileOverrides: {
              OR: filtersByAssetClass.map(({ id }) => {
                return { assetClass: AssetClass[id] };
              })
            }
          }
        ]
      };
    }

    if (filtersByTag?.length > 0) {
      where.tags = {
        some: {
          OR: filtersByTag.map(({ id }) => {
            return { id };
          })
        }
      };
    }

    if (sortColumn) {
      orderBy = [{ [sortColumn]: sortDirection }];
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

    const [orders, count] = await Promise.all([
      this.orders({
        orderBy,
        skip,
        take,
        where,
        include: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          Account: {
            include: {
              Platform: true
            }
          },
          // eslint-disable-next-line @typescript-eslint/naming-convention
          SymbolProfile: true,
          tags: true
        }
      }),
      this.prismaService.order.count({ where })
    ]);

    const activities = orders
      .filter((order) => {
        return (
          withExcludedAccounts ||
          !order.Account ||
          order.Account?.isExcluded === false
        );
      })
      .map((order) => {
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

    return { activities, count };
  }

  public async updateOrder({
    data,
    where
  }: {
    data: Prisma.OrderUpdateInput & {
      assetClass?: AssetClass;
      assetSubClass?: AssetSubClass;
      currency?: string;
      dataSource?: DataSource;
      symbol?: string;
      tags?: Tag[];
    };
    where: Prisma.OrderWhereUniqueInput;
  }): Promise<Order> {
    if (data.Account.connect.id_userId.id === null) {
      delete data.Account;
    }

    if (!data.comment) {
      data.comment = null;
    }

    const tags = data.tags ?? [];

    let isDraft = false;

    if (
      data.type === 'FEE' ||
      data.type === 'INTEREST' ||
      data.type === 'ITEM' ||
      data.type === 'LIABILITY'
    ) {
      delete data.SymbolProfile.connect;
    } else {
      delete data.SymbolProfile.update;

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

    delete data.assetClass;
    delete data.assetSubClass;
    delete data.currency;
    delete data.dataSource;
    delete data.symbol;
    delete data.tags;

    // Remove existing tags
    await this.prismaService.order.update({
      data: { tags: { set: [] } },
      where
    });

    return this.prismaService.order.update({
      data: {
        ...data,
        isDraft,
        tags: {
          connect: tags.map(({ id }) => {
            return { id };
          })
        }
      },
      where
    });
  }
}
