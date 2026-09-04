import { AccountBalanceService } from '@ghostfolio/api/app/account-balance/account-balance.service';
import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { CashDetails } from '@ghostfolio/api/app/account/interfaces/cash-details.interface';
import { AssetProfileChangedEvent } from '@ghostfolio/api/events/asset-profile-changed.event';
import { PortfolioChangedEvent } from '@ghostfolio/api/events/portfolio-changed.event';
import {
  isAccountBalanceInFuture,
  WHERE_ACCOUNT_NOT_EXCLUDED
} from '@ghostfolio/api/helper/account.helper';
import {
  getTagsWithDraftTag,
  isActivityInFuture,
  isDraftTagToBeAssigned,
  WHERE_ACTIVITY_NOT_DRAFT
} from '@ghostfolio/api/helper/activity.helper';
import { LogPerformance } from '@ghostfolio/api/interceptors/performance-logging/performance-logging.interceptor';
import { adjustActivityBySplits } from '@ghostfolio/api/services/asset-profile-split/asset-profile-split.helper';
import { AssetProfileSplitService } from '@ghostfolio/api/services/asset-profile-split/asset-profile-split.service';
import { BenchmarkService } from '@ghostfolio/api/services/benchmark/benchmark.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { DataGatheringService } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import { TagService } from '@ghostfolio/api/services/tag/tag.service';
import {
  DATA_GATHERING_QUEUE_PRIORITY_HIGH,
  GATHER_ASSET_PROFILE_PROCESS_JOB_NAME,
  GATHER_ASSET_PROFILE_PROCESS_JOB_OPTIONS,
  NON_INVESTMENT_ACTIVITY_TYPES,
  TAG_ID_DRAFT,
  TAG_ID_EXCLUDE_FROM_ANALYSIS
} from '@ghostfolio/common/config';
import {
  canDeleteAssetProfile,
  getAssetProfileIdentifier,
  getStartOfUtcDateOfTomorrow,
  isDraftActivity,
  isValidCustomAssetProfileSymbol
} from '@ghostfolio/common/helper';
import {
  ActivitiesResponse,
  Activity,
  AssetProfileIdentifier,
  EnhancedAssetProfile,
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
import { groupBy, uniqBy } from 'lodash';
import { randomUUID } from 'node:crypto';

@Injectable()
export class ActivitiesService {
  public constructor(
    private readonly accountBalanceService: AccountBalanceService,
    private readonly accountService: AccountService,
    private readonly assetProfileSplitService: AssetProfileSplitService,
    private readonly benchmarkService: BenchmarkService,
    private readonly dataGatheringService: DataGatheringService,
    private readonly dataProviderService: DataProviderService,
    private readonly eventEmitter: EventEmitter2,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly marketDataService: MarketDataService,
    private readonly prismaService: PrismaService,
    private readonly symbolProfileService: SymbolProfileService,
    private readonly tagService: TagService
  ) {}

  public areCashActivitiesExcludedByFilters(filters: Filter[] = []) {
    const {
      ASSET_CLASS: filtersByAssetClass = [],
      DATA_SOURCE: [filterByDataSource] = [],
      SYMBOL: [filterBySymbol] = [],
      TAG: filtersByTag = []
    } = groupBy(filters, ({ type }) => {
      return type;
    });

    const isFilteredByAssetClassOtherThanLiquidity =
      filtersByAssetClass.length > 0 &&
      !filtersByAssetClass.some(({ id }) => {
        return id === AssetClass.LIQUIDITY;
      });

    const isFilteredByAssetProfile = !!(filterByDataSource || filterBySymbol);
    const isFilteredByTag = filtersByTag.length > 0;

    const isFilteredByUnsupportedType = filters.some(({ type }) => {
      return ![
        'ACCOUNT',
        'ASSET_CLASS',
        'DATA_SOURCE',
        'SYMBOL',
        'TAG'
      ].includes(type);
    });

    return (
      isFilteredByAssetClassOtherThanLiquidity ||
      isFilteredByAssetProfile ||
      isFilteredByTag ||
      isFilteredByUnsupportedType
    );
  }

  public async assignTags({
    dataSource,
    symbol,
    tags,
    userId
  }: { tags: Tag[]; userId: string } & AssetProfileIdentifier) {
    await this.tagService.validateTagIdsWithoutDraftTag({
      userId,
      tagIds: tags.map(({ id }) => {
        return id;
      })
    });

    const activities = await this.prismaService.order.findMany({
      include: { tags: { select: { id: true } } },
      where: {
        userId,
        SymbolProfile: {
          dataSource,
          symbol
        }
      }
    });

    const tagsToAssign = tags.map(({ id }) => {
      return { id };
    });

    await Promise.all(
      activities.map((activity) => {
        // The set operation replaces all existing connections with the provided
        // ones, hence the "Draft" tag of an individual activity is carried over
        const tagsToSet = isDraftActivity(activity)
          ? [...tagsToAssign, { id: TAG_ID_DRAFT }]
          : tagsToAssign;

        return this.prismaService.order.update({
          data: {
            tags: {
              set: tagsToSet
            }
          },
          where: { id: activity.id }
        });
      })
    );

    this.eventEmitter.emit(
      PortfolioChangedEvent.getName(),
      new PortfolioChangedEvent({
        userId
      })
    );
  }

  public async createActivity(
    data: Prisma.OrderCreateInput & {
      accountId?: string;
      assetClass?: AssetClass;
      assetSubClass?: AssetSubClass;
      currency?: string;
      symbol?: string;
      tags?: { id: string }[];
      updateAccountBalance?: boolean;
      userId: string;
    }
  ): Promise<Order> {
    const tags = data.tags ?? [];

    await this.tagService.validateTagIds({
      tagIds: tags.map(({ id }) => {
        return id;
      }),
      userId: data.userId
    });

    let account:
      Prisma.AccountCreateNestedOneWithoutActivitiesInput | undefined;

    if (data.accountId) {
      account = {
        connect: {
          id_userId: {
            userId: data.userId,
            id: data.accountId
          }
        }
      };
    }

    const accountId = data.accountId;
    const updateAccountBalance = data.updateAccountBalance ?? false;
    const userId = data.userId;

    if (
      NON_INVESTMENT_ACTIVITY_TYPES.includes(data.type) ||
      (data.SymbolProfile.connectOrCreate.create.dataSource === 'MANUAL' &&
        data.type === 'BUY')
    ) {
      const assetClass = data.assetClass;
      const assetSubClass = data.assetSubClass;
      const dataSource: DataSource = 'MANUAL';

      let name = data.SymbolProfile.connectOrCreate.create.name;
      let symbol: string;

      if (
        isValidCustomAssetProfileSymbol(
          data.SymbolProfile.connectOrCreate.create.symbol
        )
      ) {
        // Connect custom asset profile (clone)
        symbol = data.SymbolProfile.connectOrCreate.create.symbol;
      } else {
        // Create custom asset profile
        name = name ?? data.SymbolProfile.connectOrCreate.create.symbol;
        symbol = randomUUID();
      }

      data.SymbolProfile.connectOrCreate.create.assetClass = assetClass;
      data.SymbolProfile.connectOrCreate.create.assetSubClass = assetSubClass;
      data.SymbolProfile.connectOrCreate.create.dataSource = dataSource;
      data.SymbolProfile.connectOrCreate.create.name = name;
      data.SymbolProfile.connectOrCreate.create.symbol = symbol;
      data.SymbolProfile.connectOrCreate.create.userId = userId;
      data.SymbolProfile.connectOrCreate.where.dataSource_symbol = {
        dataSource,
        symbol
      };
    }

    if (data.SymbolProfile.connectOrCreate.create.dataSource !== 'MANUAL') {
      this.dataGatheringService.addJobToQueue({
        data: {
          dataSource: data.SymbolProfile.connectOrCreate.create.dataSource,
          symbol: data.SymbolProfile.connectOrCreate.create.symbol
        },
        name: GATHER_ASSET_PROFILE_PROCESS_JOB_NAME,
        opts: {
          ...GATHER_ASSET_PROFILE_PROCESS_JOB_OPTIONS,
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

    delete data.symbol;
    delete data.tags;
    delete data.updateAccountBalance;
    delete data.userId;

    const orderData: Prisma.OrderCreateInput = data;

    const tagsToConnect = getTagsWithDraftTag({
      tags,
      date: data.date as Date,
      draftTag: { id: TAG_ID_DRAFT },
      type: data.type
    });

    const activity = await this.prismaService.order.create({
      data: {
        ...orderData,
        account,
        tags: {
          connect: tagsToConnect
        }
      },
      include: { SymbolProfile: true }
    });

    if (accountId && updateAccountBalance === true) {
      let amount = new Big(data.unitPrice).mul(data.quantity);

      if (['BUY', 'FEE'].includes(data.type)) {
        amount = amount.mul(-1);
      }

      amount = amount.minus(data.fee);

      await this.accountService.updateAccountBalance({
        accountId,
        userId,
        amount: amount.toNumber(),
        currency: activity.currency ?? activity.SymbolProfile.currency,
        date: data.date as Date
      });
    }

    this.eventEmitter.emit(
      AssetProfileChangedEvent.getName(),
      new AssetProfileChangedEvent({
        currency: activity.SymbolProfile.currency,
        dataSource: activity.SymbolProfile.dataSource,
        symbol: activity.SymbolProfile.symbol
      })
    );

    this.eventEmitter.emit(
      PortfolioChangedEvent.getName(),
      new PortfolioChangedEvent({
        userId: activity.userId
      })
    );

    return activity;
  }

  public async deleteActivity(
    where: Prisma.OrderWhereUniqueInput
  ): Promise<Order> {
    const activity = await this.prismaService.order.delete({
      where
    });

    const [symbolProfile] =
      await this.symbolProfileService.getSymbolProfilesByIds([
        activity.symbolProfileId
      ]);

    const benchmarkAssetProfiles =
      await this.benchmarkService.getBenchmarkAssetProfiles();

    const isBenchmark = benchmarkAssetProfiles.some(({ id }) => {
      return id === symbolProfile.id;
    });

    if (
      canDeleteAssetProfile({
        isBenchmark,
        activitiesCount: symbolProfile.activitiesCount,
        symbol: symbolProfile.symbol,
        watchedByCount: symbolProfile.watchedByCount
      })
    ) {
      await this.marketDataService.deleteMany({
        dataSource: symbolProfile.dataSource,
        symbol: symbolProfile.symbol
      });

      await this.symbolProfileService.deleteById(activity.symbolProfileId);
    }

    this.eventEmitter.emit(
      PortfolioChangedEvent.getName(),
      new PortfolioChangedEvent({
        userId: activity.userId
      })
    );

    return activity;
  }

  public async deleteActivities({
    endDate,
    filters,
    startDate,
    types,
    userId
  }: {
    endDate?: Date;
    filters?: Filter[];
    startDate?: Date;
    types?: ActivityType[];
    userId: string;
  }): Promise<number> {
    const where = this.getWhereClause({
      endDate,
      filters,
      startDate,
      types,
      userId,
      includeDrafts: true,
      withExcludedAccountsAndActivities: true
    });

    const activities = await this.prismaService.order.findMany({
      where,
      distinct: ['symbolProfileId'],
      select: { symbolProfileId: true }
    });

    const { count } = await this.prismaService.order.deleteMany({ where });

    const [benchmarkAssetProfiles, symbolProfiles] = await Promise.all([
      this.benchmarkService.getBenchmarkAssetProfiles(),
      this.symbolProfileService.getSymbolProfilesByIds(
        activities.map(({ symbolProfileId }) => {
          return symbolProfileId;
        })
      )
    ]);

    for (const {
      activitiesCount,
      dataSource,
      id,
      symbol,
      watchedByCount
    } of symbolProfiles) {
      const isBenchmark = benchmarkAssetProfiles.some(
        (benchmarkAssetProfile) => {
          return benchmarkAssetProfile.id === id;
        }
      );

      if (
        canDeleteAssetProfile({
          activitiesCount,
          isBenchmark,
          symbol,
          watchedByCount
        })
      ) {
        await this.marketDataService.deleteMany({ dataSource, symbol });
        await this.symbolProfileService.deleteById(id);
      }
    }

    this.eventEmitter.emit(
      PortfolioChangedEvent.getName(),
      new PortfolioChangedEvent({ userId })
    );

    return count;
  }

  /**
   * Generates synthetic activities for cash holdings based on account balance history.
   * Treat currencies as assets with a fixed unit price of 1.0 (in their own currency) to allow
   * performance tracking based on exchange rate fluctuations.
   *
   * @param cashDetails - The cash balance details.
   * @param filters - Optional filters to apply.
   * @param userCurrency - The base currency of the user.
   * @param userId - The ID of the user.
   * @returns A response containing the list of synthetic cash activities.
   */
  public async getCashActivities({
    cashDetails,
    filters = [],
    userCurrency,
    userId
  }: {
    cashDetails: CashDetails;
    filters?: Filter[];
    userCurrency: string;
    userId: string;
  }): Promise<ActivitiesResponse> {
    if (this.areCashActivitiesExcludedByFilters(filters)) {
      return {
        activities: [],
        count: 0
      };
    }

    const activities: Activity[] = [];
    const startOfUtcDateOfTomorrow = getStartOfUtcDateOfTomorrow();

    for (const account of cashDetails.accounts) {
      const { balances } = await this.accountBalanceService.getAccountBalances({
        userCurrency,
        userId,
        filters: [{ id: account.id, type: 'ACCOUNT' }]
      });

      let currentBalance = 0;
      let currentBalanceInBaseCurrency = 0;

      for (const balanceItem of balances) {
        if (
          isAccountBalanceInFuture({
            startOfUtcDateOfTomorrow,
            date: balanceItem.date
          })
        ) {
          continue;
        }

        const syntheticActivityTemplate: Activity = {
          userId,
          accountId: account.id,
          accountUserId: account.userId,
          assetProfile: {
            activitiesCount: 0,
            assetClass: AssetClass.LIQUIDITY,
            assetSubClass: AssetSubClass.CASH,
            countries: [],
            createdAt: new Date(balanceItem.date),
            currency: account.currency,
            dataSource:
              this.dataProviderService.getDataSourceForExchangeRates(),
            holdings: [],
            id: account.currency,
            isActive: true,
            name: account.currency,
            sectors: [],
            symbol: account.currency,
            updatedAt: new Date(balanceItem.date)
          },
          comment: account.name,
          createdAt: new Date(balanceItem.date),
          currency: account.currency,
          date: new Date(balanceItem.date),
          fee: 0,
          feeInAssetProfileCurrency: 0,
          feeInBaseCurrency: 0,
          id: balanceItem.id,
          quantity: 1,
          symbolProfileId: account.currency,
          type: ActivityType.BUY,
          unitPrice: 1,
          unitPriceInAssetProfileCurrency: 1,
          updatedAt: new Date(balanceItem.date),
          valueInBaseCurrency: 0,
          value: 0
        };

        if (currentBalance < balanceItem.value) {
          // BUY
          activities.push({
            ...syntheticActivityTemplate,
            quantity: balanceItem.value - currentBalance,
            type: ActivityType.BUY,
            value: balanceItem.value - currentBalance,
            valueInBaseCurrency:
              balanceItem.valueInBaseCurrency - currentBalanceInBaseCurrency
          });
        } else if (currentBalance > balanceItem.value) {
          // SELL
          activities.push({
            ...syntheticActivityTemplate,
            quantity: currentBalance - balanceItem.value,
            type: ActivityType.SELL,
            value: currentBalance - balanceItem.value,
            valueInBaseCurrency:
              currentBalanceInBaseCurrency - balanceItem.valueInBaseCurrency
          });
        }

        currentBalance = balanceItem.value;
        currentBalanceInBaseCurrency = balanceItem.valueInBaseCurrency;
      }
    }

    return {
      activities,
      count: activities.length
    };
  }

  public async getLatestActivity({
    dataSource,
    symbol
  }: AssetProfileIdentifier) {
    return this.prismaService.order.findFirst({
      orderBy: {
        date: 'desc'
      },
      where: {
        SymbolProfile: { dataSource, symbol }
      }
    });
  }

  public async getActivities({
    endDate,
    filters,
    includeDrafts = false,
    skip,
    sortColumn,
    sortDirection = 'asc',
    startDate,
    take = Number.MAX_SAFE_INTEGER,
    types,
    userCurrency,
    userId,
    withExcludedAccountsAndActivities = false
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
    withExcludedAccountsAndActivities?: boolean;
  }): Promise<ActivitiesResponse> {
    let orderBy: Prisma.Enumerable<Prisma.OrderOrderByWithRelationInput> = [
      { date: 'asc' }
    ];

    if (sortColumn) {
      orderBy = [{ [sortColumn]: sortDirection }];
    }

    const where = this.getWhereClause({
      endDate,
      filters,
      includeDrafts,
      startDate,
      types,
      userId,
      withExcludedAccountsAndActivities
    });

    const [orders, count] = await Promise.all([
      this.orders({
        skip,
        take,
        where,
        include: {
          account: {
            include: {
              platform: true,
              tags: {
                include: {
                  tag: true
                }
              }
            }
          },
          // eslint-disable-next-line @typescript-eslint/naming-convention
          SymbolProfile: true,
          tags: true
        },
        orderBy: [...orderBy, { id: sortDirection }]
      }),
      this.prismaService.order.count({ where })
    ]);

    for (const order of orders) {
      if (order.account) {
        order.account.tags = (
          order.account.tags as unknown as { tag: Tag }[]
        ).map(({ tag }) => {
          return tag;
        });
      }
    }

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

        const [
          feeInAssetProfileCurrency = 0,
          feeInBaseCurrency = 0,
          unitPriceInAssetProfileCurrency = 0,
          valueInBaseCurrency = 0
        ] = await Promise.all([
          this.exchangeRateDataService.toCurrencyAtDate(
            order.fee,
            order.currency ?? order.SymbolProfile.currency,
            order.SymbolProfile.currency,
            order.date
          ),
          this.exchangeRateDataService.toCurrencyAtDate(
            order.fee,
            order.currency ?? order.SymbolProfile.currency,
            userCurrency,
            order.date
          ),
          this.exchangeRateDataService.toCurrencyAtDate(
            order.unitPrice,
            order.currency ?? order.SymbolProfile.currency,
            order.SymbolProfile.currency,
            order.date
          ),
          this.exchangeRateDataService.toCurrencyAtDate(
            value,
            order.currency ?? order.SymbolProfile.currency,
            userCurrency,
            order.date
          )
        ]);

        return {
          ...order,
          assetProfile,
          feeInAssetProfileCurrency,
          feeInBaseCurrency,
          unitPriceInAssetProfileCurrency,
          value,
          valueInBaseCurrency
        };
      })
    );

    return { activities, count };
  }

  /**
   * Retrieves all activities required for the portfolio calculator, including both standard asset activities
   * and optional synthetic activities representing cash activities.
   */
  @LogPerformance
  public async getActivitiesForPortfolioCalculator({
    filters,
    userCurrency,
    userId,
    withCash = false
  }: {
    /** Optional filters to apply to the activities. */
    filters?: Filter[];
    /** The base currency of the user. */
    userCurrency: string;
    /** The ID of the user. */
    userId: string;
    /** Whether to include cash activities in the result. */
    withCash?: boolean;
  }) {
    const [activities, splits] = await Promise.all([
      this.getActivities({
        filters,
        userCurrency,
        userId,
        withExcludedAccountsAndActivities: false // TODO
      }),
      this.assetProfileSplitService.getSplitsByUserId({ userId })
    ]);

    if (splits.length > 0) {
      const splitsBySymbolProfileId = groupBy(splits, 'symbolProfileId');

      activities.activities = activities.activities.map((activity) => {
        return adjustActivityBySplits(
          activity,
          splitsBySymbolProfileId[activity.assetProfile.id] ?? []
        );
      });
    }

    if (withCash && !this.areCashActivitiesExcludedByFilters(filters)) {
      const cashDetails = await this.accountService.getCashDetails({
        filters,
        userId,
        currency: userCurrency
      });

      const cashActivities = await this.getCashActivities({
        cashDetails,
        filters,
        userCurrency,
        userId
      });

      activities.activities.push(...cashActivities.activities);
      activities.count += cashActivities.count;
    }

    return activities;
  }

  public async getStatisticsByCurrency(
    currency: EnhancedAssetProfile['currency']
  ): Promise<{
    activitiesCount: EnhancedAssetProfile['activitiesCount'];
    dateOfFirstActivity: EnhancedAssetProfile['dateOfFirstActivity'];
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

  /**
   * Returns the id of every user who has an activity for the given asset
   * profile, including draft activities and activities of excluded accounts
   */
  public async getUserIdsBySymbolProfileId(
    symbolProfileId: string
  ): Promise<string[]> {
    const activitiesByUser = await this.prismaService.order.groupBy({
      by: ['userId'],
      where: {
        symbolProfileId
      }
    });

    return activitiesByUser.map(({ userId }) => {
      return userId;
    });
  }

  public async order(
    orderWhereUniqueInput: Prisma.OrderWhereUniqueInput
  ): Promise<Order | null> {
    return this.prismaService.order.findUnique({
      where: orderWhereUniqueInput
    });
  }

  public async updateActivity({
    data,
    originalDate,
    userId,
    where
  }: {
    data: Prisma.OrderUpdateInput & {
      assetClass?: AssetClass;
      assetSubClass?: AssetSubClass;
      currency?: string;
      symbol?: string;
      tags?: { id: string }[];
      type?: ActivityType;
    };
    originalDate: Date;
    userId: string;
    where: Prisma.OrderWhereUniqueInput;
  }): Promise<Order> {
    const areTagsProvided = data.tags !== undefined;
    const tags = data.tags ?? [];

    await this.tagService.validateTagIds({
      userId,
      tagIds: tags.map(({ id }) => {
        return id;
      })
    });

    if (!data.comment) {
      data.comment = null;
    }

    if (
      NON_INVESTMENT_ACTIVITY_TYPES.includes(data.type) ||
      (data.SymbolProfile.connect.dataSource_symbol.dataSource === 'MANUAL' &&
        data.type === 'BUY')
    ) {
      delete data.SymbolProfile.connect;
      delete data.SymbolProfile.update.name;
    } else {
      delete data.SymbolProfile.update;

      if (!isActivityInFuture({ date: data.date as Date })) {
        // Gather symbol data of order in the background, if the date is not in
        // the future
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
    delete data.symbol;
    delete data.tags;

    // Leave the tags untouched if the request does not provide them, so that a
    // partial update cannot drop the "Draft" tag
    let tagsToUpdate: Prisma.OrderUpdateInput['tags'];

    if (areTagsProvided) {
      tagsToUpdate = {
        set: getTagsWithDraftTag({
          originalDate,
          tags,
          date: data.date as Date,
          draftTag: { id: TAG_ID_DRAFT },
          type: data.type
        })
      };
    } else if (
      isDraftTagToBeAssigned({
        originalDate,
        date: data.date as Date,
        type: data.type
      })
    ) {
      tagsToUpdate = { connect: { id: TAG_ID_DRAFT } };
    }

    const activity = await this.prismaService.order.update({
      where,
      data: {
        ...data,
        tags: tagsToUpdate
      }
    });

    this.eventEmitter.emit(
      PortfolioChangedEvent.getName(),
      new PortfolioChangedEvent({
        userId: activity.userId
      })
    );

    return activity;
  }

  private getWhereClause({
    endDate,
    filters,
    includeDrafts,
    startDate,
    types,
    userId,
    withExcludedAccountsAndActivities
  }: {
    endDate?: Date;
    filters?: Filter[];
    includeDrafts: boolean;
    startDate?: Date;
    types?: ActivityType[];
    userId: string;
    withExcludedAccountsAndActivities: boolean;
  }): Prisma.OrderWhereInput {
    const andConditions: Prisma.OrderWhereInput[] = [];
    const where: Prisma.OrderWhereInput = { userId, AND: andConditions };

    if (endDate) {
      andConditions.push({ date: { lte: endDate } });
    }

    if (startDate) {
      andConditions.push({ date: { gt: startDate } });
    }

    const {
      ACCOUNT: filtersByAccount = [],
      ASSET_CLASS: filtersByAssetClass = [],
      DATA_SOURCE: [filterByDataSource] = [],
      SEARCH_QUERY: [filterBySearchQuery] = [],
      SYMBOL: [filterBySymbol] = [],
      TAG: filtersByTag = []
    } = groupBy(filters, ({ type }) => {
      return type;
    });

    if (filtersByAccount.length > 0) {
      where.accountId = {
        in: filtersByAccount.map(({ id }) => {
          return id;
        })
      };
    }

    const isFilteredByDraftTag = filtersByTag.some(({ id }) => {
      return id === TAG_ID_DRAFT;
    });

    if (includeDrafts === false && !isFilteredByDraftTag) {
      andConditions.push(WHERE_ACTIVITY_NOT_DRAFT);
    }

    if (filtersByAssetClass.length > 0) {
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
                  { assetProfileOverrides: { assetClass: null } },
                  { assetProfileOverrides: { is: null } }
                ]
              }
            ]
          },
          {
            assetProfileOverrides: {
              OR: filtersByAssetClass.map(({ id }) => {
                return { assetClass: AssetClass[id] };
              })
            }
          }
        ]
      };
    }

    if (filterByDataSource && filterBySymbol) {
      if (where.SymbolProfile) {
        where.SymbolProfile = {
          AND: [
            where.SymbolProfile,
            {
              AND: [
                { dataSource: filterByDataSource.id as DataSource },
                { symbol: filterBySymbol.id }
              ]
            }
          ]
        };
      } else {
        where.SymbolProfile = {
          AND: [
            { dataSource: filterByDataSource.id as DataSource },
            { symbol: filterBySymbol.id }
          ]
        };
      }
    }

    if (filterBySearchQuery) {
      const searchQueryWhereInput: Prisma.SymbolProfileWhereInput[] = [
        { id: { mode: 'insensitive', startsWith: filterBySearchQuery.id } },
        { isin: { mode: 'insensitive', startsWith: filterBySearchQuery.id } },
        { name: { mode: 'insensitive', startsWith: filterBySearchQuery.id } },
        { symbol: { mode: 'insensitive', startsWith: filterBySearchQuery.id } }
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

    if (filtersByTag.length > 0) {
      andConditions.push({
        OR: [
          {
            tags: {
              some: {
                OR: filtersByTag.map(({ id }) => {
                  return { id };
                })
              }
            }
          },
          {
            account: {
              tags: {
                some: {
                  OR: filtersByTag.map(({ id }) => {
                    return { tagId: id };
                  })
                }
              }
            }
          }
        ]
      });
    }

    if (types?.length > 0) {
      where.type = { in: types };
    }

    if (withExcludedAccountsAndActivities === false) {
      where.OR = [{ account: null }, { account: WHERE_ACCOUNT_NOT_EXCLUDED }];

      where.tags = {
        none: {
          id: TAG_ID_EXCLUDE_FROM_ANALYSIS
        }
      };
    }

    return where;
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
