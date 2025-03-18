import { OrderService } from '@ghostfolio/api/app/order/order.service';
import { SubscriptionService } from '@ghostfolio/api/app/subscription/subscription.service';
import { environment } from '@ghostfolio/api/environments/environment';
import { BenchmarkService } from '@ghostfolio/api/services/benchmark/benchmark.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import {
  DEFAULT_CURRENCY,
  PROPERTY_CURRENCIES,
  PROPERTY_IS_READ_ONLY_MODE,
  PROPERTY_IS_USER_SIGNUP_ENABLED
} from '@ghostfolio/common/config';
import {
  getAssetProfileIdentifier,
  getCurrencyFromSymbol,
  isCurrency
} from '@ghostfolio/common/helper';
import {
  AdminData,
  AdminMarketData,
  AdminMarketDataDetails,
  AdminMarketDataItem,
  AdminUsers,
  AssetProfileIdentifier,
  EnhancedSymbolProfile,
  Filter
} from '@ghostfolio/common/interfaces';
import { Sector } from '@ghostfolio/common/interfaces/sector.interface';
import { MarketDataPreset } from '@ghostfolio/common/types';

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  AssetClass,
  AssetSubClass,
  DataSource,
  Prisma,
  PrismaClient,
  Property,
  SymbolProfile
} from '@prisma/client';
import { differenceInDays } from 'date-fns';
import { groupBy } from 'lodash';

@Injectable()
export class AdminService {
  public constructor(
    private readonly benchmarkService: BenchmarkService,
    private readonly configurationService: ConfigurationService,
    private readonly dataProviderService: DataProviderService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly marketDataService: MarketDataService,
    private readonly orderService: OrderService,
    private readonly prismaService: PrismaService,
    private readonly propertyService: PropertyService,
    private readonly subscriptionService: SubscriptionService,
    private readonly symbolProfileService: SymbolProfileService
  ) {}

  public async addAssetProfile({
    currency,
    dataSource,
    symbol
  }: AssetProfileIdentifier & { currency?: string }): Promise<
    SymbolProfile | never
  > {
    try {
      if (dataSource === 'MANUAL') {
        return this.symbolProfileService.add({
          currency,
          dataSource,
          symbol
        });
      }

      const assetProfiles = await this.dataProviderService.getAssetProfiles([
        { dataSource, symbol }
      ]);

      if (!assetProfiles[symbol]?.currency) {
        throw new BadRequestException(
          `Asset profile not found for ${symbol} (${dataSource})`
        );
      }

      return this.symbolProfileService.add(
        assetProfiles[symbol] as Prisma.SymbolProfileCreateInput
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException(
          `Asset profile of ${symbol} (${dataSource}) already exists`
        );
      }

      throw error;
    }
  }

  public async deleteProfileData({
    dataSource,
    symbol
  }: AssetProfileIdentifier) {
    await this.marketDataService.deleteMany({ dataSource, symbol });

    const currency = getCurrencyFromSymbol(symbol);
    const customCurrencies = (await this.propertyService.getByKey(
      PROPERTY_CURRENCIES
    )) as string[];

    if (customCurrencies.includes(currency)) {
      const updatedCustomCurrencies = customCurrencies.filter(
        (customCurrency) => {
          return customCurrency !== currency;
        }
      );

      await this.putSetting(
        PROPERTY_CURRENCIES,
        JSON.stringify(updatedCustomCurrencies)
      );
    } else {
      await this.symbolProfileService.delete({ dataSource, symbol });
    }
  }

  public async get(): Promise<AdminData> {
    const exchangeRates = this.exchangeRateDataService
      .getCurrencies()
      .filter((currency) => {
        return currency !== DEFAULT_CURRENCY;
      })
      .map((currency) => {
        const label1 = DEFAULT_CURRENCY;
        const label2 = currency;

        return {
          label1,
          label2,
          dataSource:
            DataSource[
              this.configurationService.get('DATA_SOURCE_EXCHANGE_RATES')
            ],
          symbol: `${label1}${label2}`,
          value: this.exchangeRateDataService.toCurrency(
            1,
            DEFAULT_CURRENCY,
            currency
          )
        };
      });

    const [settings, transactionCount, userCount] = await Promise.all([
      this.propertyService.get(),
      this.prismaService.order.count(),
      this.countUsersWithAnalytics()
    ]);

    return {
      exchangeRates,
      settings,
      transactionCount,
      userCount,
      version: environment.version
    };
  }

  public async getMarketData({
    filters,
    presetId,
    sortColumn,
    sortDirection,
    skip,
    take = Number.MAX_SAFE_INTEGER
  }: {
    filters?: Filter[];
    presetId?: MarketDataPreset;
    skip?: number;
    sortColumn?: string;
    sortDirection?: Prisma.SortOrder;
    take?: number;
  }): Promise<AdminMarketData> {
    let orderBy: Prisma.Enumerable<Prisma.SymbolProfileOrderByWithRelationInput> =
      [{ symbol: 'asc' }];
    const where: Prisma.SymbolProfileWhereInput = {};

    if (presetId === 'BENCHMARKS') {
      const benchmarkAssetProfiles =
        await this.benchmarkService.getBenchmarkAssetProfiles();

      where.id = {
        in: benchmarkAssetProfiles.map(({ id }) => {
          return id;
        })
      };
    } else if (presetId === 'CURRENCIES') {
      return this.getMarketDataForCurrencies();
    } else if (
      presetId === 'ETF_WITHOUT_COUNTRIES' ||
      presetId === 'ETF_WITHOUT_SECTORS'
    ) {
      filters = [{ id: 'ETF', type: 'ASSET_SUB_CLASS' }];
    }

    const searchQuery = filters.find(({ type }) => {
      return type === 'SEARCH_QUERY';
    })?.id;

    const { ASSET_SUB_CLASS: filtersByAssetSubClass } = groupBy(
      filters,
      ({ type }) => {
        return type;
      }
    );

    const marketDataItems = await this.prismaService.marketData.groupBy({
      _count: true,
      by: ['dataSource', 'symbol']
    });

    if (filtersByAssetSubClass) {
      where.assetSubClass = AssetSubClass[filtersByAssetSubClass[0].id];
    }

    if (searchQuery) {
      where.OR = [
        { id: { mode: 'insensitive', startsWith: searchQuery } },
        { isin: { mode: 'insensitive', startsWith: searchQuery } },
        { name: { mode: 'insensitive', startsWith: searchQuery } },
        { symbol: { mode: 'insensitive', startsWith: searchQuery } }
      ];
    }

    if (sortColumn) {
      orderBy = [{ [sortColumn]: sortDirection }];

      if (sortColumn === 'activitiesCount') {
        orderBy = {
          Order: {
            _count: sortDirection
          }
        };
      }
    }

    const extendedPrismaClient = this.getExtendedPrismaClient();

    try {
      const symbolProfileResult = await Promise.all([
        extendedPrismaClient.symbolProfile.findMany({
          orderBy,
          skip,
          take,
          where,
          select: {
            _count: {
              select: { Order: true }
            },
            assetClass: true,
            assetSubClass: true,
            comment: true,
            countries: true,
            currency: true,
            dataSource: true,
            id: true,
            isUsedByUsersWithSubscription: true,
            name: true,
            Order: {
              orderBy: [{ date: 'asc' }],
              select: { date: true },
              take: 1
            },
            scraperConfiguration: true,
            sectors: true,
            symbol: true,
            SymbolProfileOverrides: true
          }
        }),
        this.prismaService.symbolProfile.count({ where })
      ]);
      const assetProfiles = symbolProfileResult[0];
      let count = symbolProfileResult[1];

      const lastMarketPrices = await this.prismaService.marketData.findMany({
        distinct: ['dataSource', 'symbol'],
        orderBy: { date: 'desc' },
        select: {
          dataSource: true,
          marketPrice: true,
          symbol: true
        },
        where: {
          dataSource: {
            in: assetProfiles.map(({ dataSource }) => {
              return dataSource;
            })
          },
          symbol: {
            in: assetProfiles.map(({ symbol }) => {
              return symbol;
            })
          }
        }
      });

      const lastMarketPriceMap = new Map<string, number>();

      for (const { dataSource, marketPrice, symbol } of lastMarketPrices) {
        lastMarketPriceMap.set(
          getAssetProfileIdentifier({ dataSource, symbol }),
          marketPrice
        );
      }

      let marketData: AdminMarketDataItem[] = await Promise.all(
        assetProfiles.map(
          async ({
            _count,
            assetClass,
            assetSubClass,
            comment,
            countries,
            currency,
            dataSource,
            id,
            isUsedByUsersWithSubscription,
            name,
            Order,
            sectors,
            symbol,
            SymbolProfileOverrides
          }) => {
            let countriesCount = countries ? Object.keys(countries).length : 0;

            const lastMarketPrice = lastMarketPriceMap.get(
              getAssetProfileIdentifier({ dataSource, symbol })
            );

            const marketDataItemCount =
              marketDataItems.find((marketDataItem) => {
                return (
                  marketDataItem.dataSource === dataSource &&
                  marketDataItem.symbol === symbol
                );
              })?._count ?? 0;

            let sectorsCount = sectors ? Object.keys(sectors).length : 0;

            if (SymbolProfileOverrides) {
              assetClass = SymbolProfileOverrides.assetClass ?? assetClass;
              assetSubClass =
                SymbolProfileOverrides.assetSubClass ?? assetSubClass;

              if (
                (
                  SymbolProfileOverrides.countries as unknown as Prisma.JsonArray
                )?.length > 0
              ) {
                countriesCount = (
                  SymbolProfileOverrides.countries as unknown as Prisma.JsonArray
                ).length;
              }

              name = SymbolProfileOverrides.name ?? name;

              if (
                (SymbolProfileOverrides.sectors as unknown as Sector[])
                  ?.length > 0
              ) {
                sectorsCount = (
                  SymbolProfileOverrides.sectors as unknown as Prisma.JsonArray
                ).length;
              }
            }

            return {
              assetClass,
              assetSubClass,
              comment,
              currency,
              countriesCount,
              dataSource,
              id,
              lastMarketPrice,
              name,
              symbol,
              marketDataItemCount,
              sectorsCount,
              activitiesCount: _count.Order,
              date: Order?.[0]?.date,
              isUsedByUsersWithSubscription: await isUsedByUsersWithSubscription
            };
          }
        )
      );

      if (presetId) {
        if (presetId === 'ETF_WITHOUT_COUNTRIES') {
          marketData = marketData.filter(({ countriesCount }) => {
            return countriesCount === 0;
          });
        } else if (presetId === 'ETF_WITHOUT_SECTORS') {
          marketData = marketData.filter(({ sectorsCount }) => {
            return sectorsCount === 0;
          });
        }

        count = marketData.length;
      }

      return {
        count,
        marketData
      };
    } finally {
      await extendedPrismaClient.$disconnect();

      Logger.debug('Disconnect extended prisma client', 'AdminService');
    }
  }

  public async getMarketDataBySymbol({
    dataSource,
    symbol
  }: AssetProfileIdentifier): Promise<AdminMarketDataDetails> {
    let activitiesCount: EnhancedSymbolProfile['activitiesCount'] = 0;
    let currency: EnhancedSymbolProfile['currency'] = '-';
    let dateOfFirstActivity: EnhancedSymbolProfile['dateOfFirstActivity'];

    if (isCurrency(getCurrencyFromSymbol(symbol))) {
      currency = getCurrencyFromSymbol(symbol);
      ({ activitiesCount, dateOfFirstActivity } =
        await this.orderService.getStatisticsByCurrency(currency));
    }

    const [[assetProfile], marketData] = await Promise.all([
      this.symbolProfileService.getSymbolProfiles([
        {
          dataSource,
          symbol
        }
      ]),
      this.marketDataService.marketDataItems({
        orderBy: {
          date: 'asc'
        },
        where: {
          dataSource,
          symbol
        }
      })
    ]);

    if (assetProfile) {
      assetProfile.dataProviderInfo = this.dataProviderService
        .getDataProvider(assetProfile.dataSource)
        .getDataProviderInfo();
    }

    return {
      marketData,
      assetProfile: assetProfile ?? {
        activitiesCount,
        currency,
        dataSource,
        dateOfFirstActivity,
        symbol
      }
    };
  }

  public async getUsers({
    skip,
    take = Number.MAX_SAFE_INTEGER
  }: {
    skip?: number;
    take?: number;
  }): Promise<AdminUsers> {
    const [count, users] = await Promise.all([
      this.countUsersWithAnalytics(),
      this.getUsersWithAnalytics({ skip, take })
    ]);

    return { count, users };
  }

  public async patchAssetProfileData(
    dataSource: DataSource,
    symbol: string,
    {
      assetClass,
      assetSubClass,
      comment,
      countries,
      currency,
      dataSource: newDataSource,
      holdings,
      name,
      scraperConfiguration,
      sectors,
      symbol: newSymbol,
      symbolMapping,
      url
    }: Prisma.SymbolProfileUpdateInput
  ) {
    if (
      newSymbol &&
      newDataSource &&
      (newSymbol !== symbol || newDataSource !== dataSource)
    ) {
      await this.symbolProfileService.updateAssetProfileIdentifier(
        {
          dataSource,
          symbol
        },
        {
          dataSource: newDataSource as DataSource,
          symbol: newSymbol as string
        }
      );

      await this.marketDataService.updateAssetProfileIdentifier(
        {
          dataSource,
          symbol
        },
        {
          dataSource: newDataSource as DataSource,
          symbol: newSymbol as string
        }
      );

      const [symbolProfile] = await this.symbolProfileService.getSymbolProfiles(
        [
          {
            dataSource: dataSource as DataSource,
            symbol: symbol as string
          }
        ]
      );

      return symbolProfile;
    } else {
      const symbolProfileOverrides = {
        assetClass: assetClass as AssetClass,
        assetSubClass: assetSubClass as AssetSubClass,
        name: name as string,
        url: url as string
      };

      const updatedSymbolProfile: Prisma.SymbolProfileUpdateInput = {
        comment,
        countries,
        currency,
        dataSource,
        holdings,
        scraperConfiguration,
        sectors,
        symbol,
        symbolMapping,
        ...(dataSource === 'MANUAL'
          ? { assetClass, assetSubClass, name, url }
          : {
              SymbolProfileOverrides: {
                upsert: {
                  create: symbolProfileOverrides,
                  update: symbolProfileOverrides
                }
              }
            })
      };

      await this.symbolProfileService.updateSymbolProfile(
        {
          dataSource,
          symbol
        },
        updatedSymbolProfile
      );

      const [symbolProfile] = await this.symbolProfileService.getSymbolProfiles(
        [
          {
            dataSource: dataSource as DataSource,
            symbol: symbol as string
          }
        ]
      );

      return symbolProfile;
    }
  }

  public async putSetting(key: string, value: string) {
    let response: Property;

    if (value) {
      response = await this.propertyService.put({ key, value });
    } else {
      response = await this.propertyService.delete({ key });
    }

    if (key === PROPERTY_IS_READ_ONLY_MODE && value === 'true') {
      await this.putSetting(PROPERTY_IS_USER_SIGNUP_ENABLED, 'false');
    } else if (key === PROPERTY_CURRENCIES) {
      await this.exchangeRateDataService.initialize();
    }

    return response;
  }

  private async countUsersWithAnalytics() {
    let where: Prisma.UserWhereInput;

    if (this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION')) {
      where = {
        NOT: {
          Analytics: null
        }
      };
    }

    return this.prismaService.user.count({
      where
    });
  }

  private getExtendedPrismaClient() {
    Logger.debug('Connect extended prisma client', 'AdminService');

    const symbolProfileExtension = Prisma.defineExtension((client) => {
      return client.$extends({
        result: {
          symbolProfile: {
            isUsedByUsersWithSubscription: {
              compute: async ({ id }) => {
                const { _count } =
                  await this.prismaService.symbolProfile.findUnique({
                    select: {
                      _count: {
                        select: {
                          Order: {
                            where: {
                              User: {
                                Subscription: {
                                  some: {
                                    expiresAt: {
                                      gt: new Date()
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    },
                    where: {
                      id
                    }
                  });

                return _count.Order > 0;
              }
            }
          }
        }
      });
    });

    return new PrismaClient().$extends(symbolProfileExtension);
  }

  private async getMarketDataForCurrencies(): Promise<AdminMarketData> {
    const currencyPairs = this.exchangeRateDataService.getCurrencyPairs();

    const [lastMarketPrices, marketDataItems] = await Promise.all([
      this.prismaService.marketData.findMany({
        distinct: ['dataSource', 'symbol'],
        orderBy: { date: 'desc' },
        select: {
          dataSource: true,
          marketPrice: true,
          symbol: true
        },
        where: {
          dataSource: {
            in: currencyPairs.map(({ dataSource }) => {
              return dataSource;
            })
          },
          symbol: {
            in: currencyPairs.map(({ symbol }) => {
              return symbol;
            })
          }
        }
      }),
      this.prismaService.marketData.groupBy({
        _count: true,
        by: ['dataSource', 'symbol']
      })
    ]);

    const lastMarketPriceMap = new Map<string, number>();

    for (const { dataSource, marketPrice, symbol } of lastMarketPrices) {
      lastMarketPriceMap.set(
        getAssetProfileIdentifier({ dataSource, symbol }),
        marketPrice
      );
    }

    const marketDataPromise: Promise<AdminMarketDataItem>[] = currencyPairs.map(
      async ({ dataSource, symbol }) => {
        let activitiesCount: EnhancedSymbolProfile['activitiesCount'] = 0;
        let currency: EnhancedSymbolProfile['currency'] = '-';
        let dateOfFirstActivity: EnhancedSymbolProfile['dateOfFirstActivity'];

        if (isCurrency(getCurrencyFromSymbol(symbol))) {
          currency = getCurrencyFromSymbol(symbol);
          ({ activitiesCount, dateOfFirstActivity } =
            await this.orderService.getStatisticsByCurrency(currency));
        }

        const lastMarketPrice = lastMarketPriceMap.get(
          getAssetProfileIdentifier({ dataSource, symbol })
        );

        const marketDataItemCount =
          marketDataItems.find((marketDataItem) => {
            return (
              marketDataItem.dataSource === dataSource &&
              marketDataItem.symbol === symbol
            );
          })?._count ?? 0;

        return {
          activitiesCount,
          currency,
          dataSource,
          lastMarketPrice,
          marketDataItemCount,
          symbol,
          assetClass: AssetClass.LIQUIDITY,
          assetSubClass: AssetSubClass.CASH,
          countriesCount: 0,
          date: dateOfFirstActivity,
          id: undefined,
          name: symbol,
          sectorsCount: 0
        };
      }
    );

    const marketData = await Promise.all(marketDataPromise);
    return { marketData, count: marketData.length };
  }

  private async getUsersWithAnalytics({
    skip,
    take
  }: {
    skip?: number;
    take?: number;
  }): Promise<AdminUsers['users']> {
    let orderBy: Prisma.UserOrderByWithRelationInput = {
      createdAt: 'desc'
    };
    let where: Prisma.UserWhereInput;

    if (this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION')) {
      orderBy = {
        Analytics: {
          lastRequestAt: 'desc'
        }
      };
      where = {
        NOT: {
          Analytics: null
        }
      };
    }

    const usersWithAnalytics = await this.prismaService.user.findMany({
      orderBy,
      skip,
      take,
      where,
      select: {
        _count: {
          select: { Account: true, Order: true }
        },
        Analytics: {
          select: {
            activityCount: true,
            country: true,
            dataProviderGhostfolioDailyRequests: true,
            updatedAt: true
          }
        },
        createdAt: true,
        id: true,
        role: true,
        Subscription: true
      }
    });

    return usersWithAnalytics.map(
      ({ _count, Analytics, createdAt, id, role, Subscription }) => {
        const daysSinceRegistration =
          differenceInDays(new Date(), createdAt) + 1;
        const engagement = Analytics
          ? Analytics.activityCount / daysSinceRegistration
          : undefined;

        const subscription = this.configurationService.get(
          'ENABLE_FEATURE_SUBSCRIPTION'
        )
          ? this.subscriptionService.getSubscription({
              createdAt,
              subscriptions: Subscription
            })
          : undefined;

        return {
          createdAt,
          engagement,
          id,
          role,
          subscription,
          accountCount: _count.Account || 0,
          country: Analytics?.country,
          dailyApiRequests: Analytics?.dataProviderGhostfolioDailyRequests || 0,
          lastActivity: Analytics?.updatedAt,
          transactionCount: _count.Order || 0
        };
      }
    );
  }
}
