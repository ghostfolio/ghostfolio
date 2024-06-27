import { BenchmarkService } from '@ghostfolio/api/app/benchmark/benchmark.service';
import { OrderService } from '@ghostfolio/api/app/order/order.service';
import { SubscriptionService } from '@ghostfolio/api/app/subscription/subscription.service';
import { environment } from '@ghostfolio/api/environments/environment';
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
import { isCurrency, getCurrencyFromSymbol } from '@ghostfolio/common/helper';
import {
  AdminData,
  AdminMarketData,
  AdminMarketDataDetails,
  AdminMarketDataItem,
  EnhancedSymbolProfile,
  Filter,
  UniqueAsset
} from '@ghostfolio/common/interfaces';
import { MarketDataPreset } from '@ghostfolio/common/types';

import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AssetClass,
  AssetSubClass,
  DataSource,
  Prisma,
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
  }: UniqueAsset & { currency?: string }): Promise<SymbolProfile | never> {
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

  public async deleteProfileData({ dataSource, symbol }: UniqueAsset) {
    await this.marketDataService.deleteMany({ dataSource, symbol });
    await this.symbolProfileService.delete({ dataSource, symbol });
  }

  public async get(): Promise<AdminData> {
    return {
      exchangeRates: this.exchangeRateDataService
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
        }),
      settings: await this.propertyService.get(),
      transactionCount: await this.prismaService.order.count(),
      userCount: await this.prismaService.user.count(),
      users: await this.getUsersWithAnalytics(),
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

    let [assetProfiles, count] = await Promise.all([
      this.prismaService.symbolProfile.findMany({
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
          name: true,
          Order: {
            orderBy: [{ date: 'asc' }],
            select: { date: true },
            take: 1
          },
          scraperConfiguration: true,
          sectors: true,
          symbol: true
        }
      }),
      this.prismaService.symbolProfile.count({ where })
    ]);

    let marketData: AdminMarketDataItem[] = assetProfiles.map(
      ({
        _count,
        assetClass,
        assetSubClass,
        comment,
        countries,
        currency,
        dataSource,
        id,
        name,
        Order,
        sectors,
        symbol
      }) => {
        const countriesCount = countries ? Object.keys(countries).length : 0;
        const marketDataItemCount =
          marketDataItems.find((marketDataItem) => {
            return (
              marketDataItem.dataSource === dataSource &&
              marketDataItem.symbol === symbol
            );
          })?._count ?? 0;
        const sectorsCount = sectors ? Object.keys(sectors).length : 0;

        return {
          assetClass,
          assetSubClass,
          comment,
          currency,
          countriesCount,
          dataSource,
          id,
          name,
          symbol,
          marketDataItemCount,
          sectorsCount,
          activitiesCount: _count.Order,
          date: Order?.[0]?.date
        };
      }
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
  }

  public async getMarketDataBySymbol({
    dataSource,
    symbol
  }: UniqueAsset): Promise<AdminMarketDataDetails> {
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

  public async patchAssetProfileData({
    assetClass,
    assetSubClass,
    comment,
    countries,
    currency,
    dataSource,
    holdings,
    name,
    scraperConfiguration,
    sectors,
    symbol,
    symbolMapping,
    url
  }: Prisma.SymbolProfileUpdateInput & UniqueAsset) {
    const symbolProfileOverrides = {
      assetClass: assetClass as AssetClass,
      assetSubClass: assetSubClass as AssetSubClass,
      name: name as string,
      url: url as string
    };

    const updatedSymbolProfile: Prisma.SymbolProfileUpdateInput & UniqueAsset =
      {
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

    await this.symbolProfileService.updateSymbolProfile(updatedSymbolProfile);

    const [symbolProfile] = await this.symbolProfileService.getSymbolProfiles([
      {
        dataSource,
        symbol
      }
    ]);

    return symbolProfile;
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

  private async getMarketDataForCurrencies(): Promise<AdminMarketData> {
    const marketDataItems = await this.prismaService.marketData.groupBy({
      _count: true,
      by: ['dataSource', 'symbol']
    });

    const marketDataPromise: Promise<AdminMarketDataItem>[] =
      this.exchangeRateDataService
        .getCurrencyPairs()
        .map(async ({ dataSource, symbol }) => {
          let activitiesCount: EnhancedSymbolProfile['activitiesCount'] = 0;
          let currency: EnhancedSymbolProfile['currency'] = '-';
          let dateOfFirstActivity: EnhancedSymbolProfile['dateOfFirstActivity'];

          if (isCurrency(getCurrencyFromSymbol(symbol))) {
            currency = getCurrencyFromSymbol(symbol);
            ({ activitiesCount, dateOfFirstActivity } =
              await this.orderService.getStatisticsByCurrency(currency));
          }

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
        });

    const marketData = await Promise.all(marketDataPromise);
    return { marketData, count: marketData.length };
  }

  private async getUsersWithAnalytics(): Promise<AdminData['users']> {
    let orderBy: any = {
      createdAt: 'desc'
    };
    let where;

    if (this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION')) {
      orderBy = {
        Analytics: {
          updatedAt: 'desc'
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
      where,
      select: {
        _count: {
          select: { Account: true, Order: true }
        },
        Analytics: {
          select: {
            activityCount: true,
            country: true,
            updatedAt: true
          }
        },
        createdAt: true,
        id: true,
        role: true,
        Subscription: true
      },
      take: 30
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
          lastActivity: Analytics?.updatedAt,
          transactionCount: _count.Order || 0
        };
      }
    );
  }
}
