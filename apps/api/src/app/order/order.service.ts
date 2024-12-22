import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { PortfolioChangedEvent } from '@ghostfolio/api/events/portfolio-changed.event';
import { LogPerformance } from '@ghostfolio/api/interceptors/performance-logging/performance-logging.interceptor';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { DataGatheringService } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import {
  DATA_GATHERING_QUEUE_PRIORITY_HIGH,
  GATHER_ASSET_PROFILE_PROCESS,
  GATHER_ASSET_PROFILE_PROCESS_OPTIONS
} from '@ghostfolio/common/config';
import { getAssetProfileIdentifier } from '@ghostfolio/common/helper';
import {
  AssetProfileIdentifier,
  EnhancedSymbolProfile,
  Filter
} from '@ghostfolio/common/interfaces';
import { OrderWithAccount } from '@ghostfolio/common/types';

import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AssetClass,
  AssetSubClass,
  DataSource,
  Order,
  Prisma,
  Tag,
  Type as ActivityType
} from '@prisma/client';
import { Big } from 'big.js';
import { endOfToday, isAfter } from 'date-fns';
import { groupBy, uniqBy } from 'lodash';
import { v4 as uuidv4 } from 'uuid';

import { Activities } from './interfaces/activities.interface';

@Injectable()
export class OrderService {
  public constructor(
    private readonly accountService: AccountService,
    private readonly dataGatheringService: DataGatheringService,
    private readonly eventEmitter: EventEmitter2,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly prismaService: PrismaService,
    private readonly symbolProfileService: SymbolProfileService
  ) {}

  public async assignTags({
    dataSource,
    symbol,
    tags,
    userId
  }: { tags: Tag[]; userId: string } & AssetProfileIdentifier) {
    const orders = await this.prismaService.order.findMany({
      where: {
        userId,
        SymbolProfile: {
          dataSource,
          symbol
        }
      }
    });

    return Promise.all(
      orders.map(({ id }) =>
        this.prismaService.order.update({
          data: {
            tags: {
              // The set operation replaces all existing connections with the provided ones
              set: tags.map(({ id }) => {
                return { id };
              })
            }
          },
          where: { id }
        })
      )
    );
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
    let Account: Prisma.AccountCreateNestedOneWithoutOrderInput;

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
    const tags = data.tags ?? [];
    const updateAccountBalance = data.updateAccountBalance ?? false;
    const userId = data.userId;

    if (['FEE', 'INTEREST', 'ITEM', 'LIABILITY'].includes(data.type)) {
      const assetClass = data.assetClass;
      const assetSubClass = data.assetSubClass;
      const dataSource: DataSource = 'MANUAL';
      const id = uuidv4();
      const name = data.SymbolProfile.connectOrCreate.create.symbol;

      data.id = id;
      data.SymbolProfile.connectOrCreate.create.assetClass = assetClass;
      data.SymbolProfile.connectOrCreate.create.assetSubClass = assetSubClass;
      data.SymbolProfile.connectOrCreate.create.dataSource = dataSource;
      data.SymbolProfile.connectOrCreate.create.name = name;
      data.SymbolProfile.connectOrCreate.create.symbol = id;
      data.SymbolProfile.connectOrCreate.create.userId = userId;
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
          }),
          priority: DATA_GATHERING_QUEUE_PRIORITY_HIGH
        }
      });
    }

    delete data.accountId;
    delete data.assetClass;
    delete data.assetSubClass;

    if (!data.comment) {
      delete data.comment;
    }

    delete data.dataSource;
    delete data.symbol;
    delete data.tags;
    delete data.updateAccountBalance;
    delete data.userId;

    const orderData: Prisma.OrderCreateInput = data;

    const isDraft = ['FEE', 'INTEREST', 'ITEM', 'LIABILITY'].includes(data.type)
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
      },
      include: { SymbolProfile: true }
    });

    if (updateAccountBalance === true) {
      let amount = new Big(data.unitPrice)
        .mul(data.quantity)
        .plus(data.fee)
        .toNumber();

      if (['BUY', 'FEE'].includes(data.type)) {
        amount = new Big(amount).mul(-1).toNumber();
      }

      await this.accountService.updateAccountBalance({
        accountId,
        amount,
        userId,
        currency: data.SymbolProfile.connectOrCreate.create.currency,
        date: data.date as Date
      });
    }

    this.eventEmitter.emit(
      PortfolioChangedEvent.getName(),
      new PortfolioChangedEvent({
        userId: order.userId
      })
    );

    return order;
  }

  public async deleteOrder(
    where: Prisma.OrderWhereUniqueInput
  ): Promise<Order> {
    const order = await this.prismaService.order.delete({
      where
    });

    const [symbolProfile] =
      await this.symbolProfileService.getSymbolProfilesByIds([
        order.symbolProfileId
      ]);

    if (
      ['FEE', 'INTEREST', 'ITEM', 'LIABILITY'].includes(order.type) ||
      symbolProfile.activitiesCount === 0
    ) {
      await this.symbolProfileService.deleteById(order.symbolProfileId);
    }

    this.eventEmitter.emit(
      PortfolioChangedEvent.getName(),
      new PortfolioChangedEvent({
        userId: order.userId
      })
    );

    return order;
  }

  public async deleteOrders({
    filters,
    userId
  }: {
    filters?: Filter[];
    userId: string;
  }): Promise<number> {
    const { activities } = await this.getOrders({
      filters,
      userId,
      includeDrafts: true,
      userCurrency: undefined,
      withExcludedAccounts: true
    });

    const { count } = await this.prismaService.order.deleteMany({
      where: {
        id: {
          in: activities.map(({ id }) => {
            return id;
          })
        }
      }
    });

    const symbolProfiles =
      await this.symbolProfileService.getSymbolProfilesByIds(
        activities.map(({ symbolProfileId }) => {
          return symbolProfileId;
        })
      );

    for (const { activitiesCount, id } of symbolProfiles) {
      if (activitiesCount === 0) {
        await this.symbolProfileService.deleteById(id);
      }
    }

    this.eventEmitter.emit(
      PortfolioChangedEvent.getName(),
      new PortfolioChangedEvent({ userId })
    );

    return count;
  }

  public async getLatestOrder({ dataSource, symbol }: AssetProfileIdentifier) {
    return this.prismaService.order.findFirst({
      orderBy: {
        date: 'desc'
      },
      where: {
        SymbolProfile: { dataSource, symbol }
      }
    });
  }

  public async getOrders({
    endDate,
    filters,
    includeDrafts = false,
    skip,
    sortColumn,
    sortDirection,
    startDate,
    take = Number.MAX_SAFE_INTEGER,
    types,
    userCurrency,
    userId,
    withExcludedAccounts = false
  }: {
    endDate?: Date;
    filters?: Filter[];
    includeDrafts?: boolean;
    skip?: number;
    sortColumn?: string;
    sortDirection?: Prisma.SortOrder;
    startDate?: Date;
    take?: number;
    types?: ActivityType[];
    userCurrency: string;
    userId: string;
    withExcludedAccounts?: boolean;
  }): Promise<Activities> {
    let orderBy: Prisma.Enumerable<Prisma.OrderOrderByWithRelationInput> = [
      { date: 'asc' },
      { id: 'asc' }
    ];
    const where: Prisma.OrderWhereInput = { userId };

    let symbolProfileConditions: Prisma.SymbolProfileWhereInput[] = [];
    where.SymbolProfile = {
      AND: symbolProfileConditions
    };
    const searchQuery = filters?.find(({ type }) => {
      return type === 'SEARCH_QUERY';
    })?.id;
    if (searchQuery) {
      symbolProfileConditions.push({
        OR: [
          { id: { mode: 'insensitive', contains: searchQuery } },
          { isin: { mode: 'insensitive', contains: searchQuery } },
          { name: { mode: 'insensitive', contains: searchQuery } },
          { symbol: { mode: 'insensitive', contains: searchQuery } }
        ]
      });
    }

    if (endDate || startDate) {
      where.AND = [];

      if (endDate) {
        where.AND.push({ date: { lte: endDate } });
      }

      if (startDate) {
        where.AND.push({ date: { gt: startDate } });
      }
    }

    const {
      ACCOUNT: filtersByAccount,
      ASSET_CLASS: filtersByAssetClass,
      TAG: filtersByTag
    } = groupBy(filters, ({ type }) => {
      return type;
    });

    const filterByDataSource = filters?.find(({ type }) => {
      return type === 'DATA_SOURCE';
    })?.id;

    const filterBySymbol = filters?.find(({ type }) => {
      return type === 'SYMBOL';
    })?.id;

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
      symbolProfileConditions.push({
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
      });
    }

    if (filterByDataSource && filterBySymbol) {
      if (where.SymbolProfile) {
        where.SymbolProfile = {
          AND: [
            where.SymbolProfile,
            {
              AND: [
                { dataSource: filterByDataSource as DataSource },
                { symbol: filterBySymbol }
              ]
            }
          ]
        };
      } else {
        where.SymbolProfile = {
          AND: [
            { dataSource: filterByDataSource as DataSource },
            { symbol: filterBySymbol }
          ]
        };
      }
    }

    if (searchQuery) {
      const searchQueryWhereInput: Prisma.SymbolProfileWhereInput[] = [
        { id: { mode: 'insensitive', startsWith: searchQuery } },
        { isin: { mode: 'insensitive', startsWith: searchQuery } },
        { name: { mode: 'insensitive', startsWith: searchQuery } },
        { symbol: { mode: 'insensitive', startsWith: searchQuery } }
      ];

      if (where.SymbolProfile) {
        where.SymbolProfile = {
          AND: [
            where.SymbolProfile,
            {
              OR: searchQueryWhereInput
            }
          ]
        };
      } else {
        where.SymbolProfile = {
          OR: searchQueryWhereInput
        };
      }
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
      orderBy = [{ [sortColumn]: sortDirection }, { id: sortDirection }];
    }

    if (types) {
      where.type = { in: types };
    }

    if (withExcludedAccounts === false) {
      where.OR = [
        { Account: null },
        { Account: { NOT: { isExcluded: true } } }
      ];
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

    const assetProfileIdentifiers = uniqBy(
      orders.map(({ SymbolProfile }) => {
        return {
          dataSource: SymbolProfile.dataSource,
          symbol: SymbolProfile.symbol
        };
      }),
      ({ dataSource, symbol }) => {
        return getAssetProfileIdentifier({
          dataSource,
          symbol
        });
      }
    );

    const assetProfiles = await this.symbolProfileService.getSymbolProfiles(
      assetProfileIdentifiers
    );

    const activities = await Promise.all(
      orders.map(async (order) => {
        const assetProfile = assetProfiles.find(({ dataSource, symbol }) => {
          return (
            dataSource === order.SymbolProfile.dataSource &&
            symbol === order.SymbolProfile.symbol
          );
        });

        const value = new Big(order.quantity).mul(order.unitPrice).toNumber();

        return {
          ...order,
          value,
          feeInBaseCurrency:
            await this.exchangeRateDataService.toCurrencyAtDate(
              order.fee,
              order.SymbolProfile.currency,
              userCurrency,
              order.date
            ),
          SymbolProfile: assetProfile,
          valueInBaseCurrency:
            await this.exchangeRateDataService.toCurrencyAtDate(
              value,
              order.SymbolProfile.currency,
              userCurrency,
              order.date
            )
        };
      })
    );

    return { activities, count };
  }

  @LogPerformance
  public async getOrdersForPortfolioCalculator({
    filters,
    userCurrency,
    userId
  }: {
    filters?: Filter[];
    userCurrency: string;
    userId: string;
  }) {
    return this.getOrders({
      filters,
      userCurrency,
      userId,
      withExcludedAccounts: false // TODO
    });
  }

  public async getStatisticsByCurrency(
    currency: EnhancedSymbolProfile['currency']
  ): Promise<{
    activitiesCount: EnhancedSymbolProfile['activitiesCount'];
    dateOfFirstActivity: EnhancedSymbolProfile['dateOfFirstActivity'];
  }> {
    const { _count, _min } = await this.prismaService.order.aggregate({
      _count: true,
      _min: {
        date: true
      },
      where: { SymbolProfile: { currency } }
    });

    return {
      activitiesCount: _count as number,
      dateOfFirstActivity: _min.date
    };
  }

  public async order(
    orderWhereUniqueInput: Prisma.OrderWhereUniqueInput
  ): Promise<Order | null> {
    return this.prismaService.order.findUnique({
      where: orderWhereUniqueInput
    });
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
      type?: ActivityType;
    };
    where: Prisma.OrderWhereUniqueInput;
  }): Promise<Order> {
    if (!data.comment) {
      data.comment = null;
    }

    const tags = data.tags ?? [];

    let isDraft = false;

    if (['FEE', 'INTEREST', 'ITEM', 'LIABILITY'].includes(data.type)) {
      delete data.SymbolProfile.connect;

      if (data.Account?.connect?.id_userId?.id === null) {
        data.Account = { disconnect: true };
      }
    } else {
      delete data.SymbolProfile.update;

      isDraft = isAfter(data.date as Date, endOfToday());

      if (!isDraft) {
        // Gather symbol data of order in the background, if not draft
        this.dataGatheringService.gatherSymbols({
          dataGatheringItems: [
            {
              dataSource:
                data.SymbolProfile.connect.dataSource_symbol.dataSource,
              date: data.date as Date,
              symbol: data.SymbolProfile.connect.dataSource_symbol.symbol
            }
          ],
          priority: DATA_GATHERING_QUEUE_PRIORITY_HIGH
        });
      }
    }

    delete data.assetClass;
    delete data.assetSubClass;
    delete data.dataSource;
    delete data.symbol;
    delete data.tags;

    // Remove existing tags
    await this.prismaService.order.update({
      data: { tags: { set: [] } },
      where
    });

    const order = await this.prismaService.order.update({
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

    this.eventEmitter.emit(
      PortfolioChangedEvent.getName(),
      new PortfolioChangedEvent({
        userId: order.userId
      })
    );

    return order;
  }

  private async orders(params: {
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
}
