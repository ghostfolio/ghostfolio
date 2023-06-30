import { SubscriptionService } from '@ghostfolio/api/app/subscription/subscription.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import {
  DEFAULT_PAGE_SIZE,
  PROPERTY_CURRENCIES
} from '@ghostfolio/common/config';
import {
  AdminData,
  AdminMarketData,
  AdminMarketDataDetails,
  Filter,
  UniqueAsset
} from '@ghostfolio/common/interfaces';
import { BadRequestException, Injectable } from '@nestjs/common';
import { AssetSubClass, Prisma, Property, SymbolProfile } from '@prisma/client';
import { differenceInDays } from 'date-fns';
import { groupBy } from 'lodash';

@Injectable()
export class AdminService {
  private baseCurrency: string;

  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly dataProviderService: DataProviderService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly marketDataService: MarketDataService,
    private readonly prismaService: PrismaService,
    private readonly propertyService: PropertyService,
    private readonly subscriptionService: SubscriptionService,
    private readonly symbolProfileService: SymbolProfileService
  ) {
    this.baseCurrency = this.configurationService.get('BASE_CURRENCY');
  }

  public async addAssetProfile({
    dataSource,
    symbol
  }: UniqueAsset): Promise<SymbolProfile | never> {
    try {
      const assetProfiles = await this.dataProviderService.getAssetProfiles([
        { dataSource, symbol }
      ]);

      if (!assetProfiles[symbol]?.currency) {
        throw new BadRequestException(
          `Asset profile not found for ${symbol} (${dataSource})`
        );
      }

      return await this.symbolProfileService.add(
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
          return currency !== this.baseCurrency;
        })
        .map((currency) => {
          return {
            label1: this.baseCurrency,
            label2: currency,
            value: this.exchangeRateDataService.toCurrency(
              1,
              this.baseCurrency,
              currency
            )
          };
        }),
      settings: await this.propertyService.get(),
      transactionCount: await this.prismaService.order.count(),
      userCount: await this.prismaService.user.count(),
      users: await this.getUsersWithAnalytics()
    };
  }

  public async getMarketData({
    filters,
    sortColumn,
    sortDirection,
    skip,
    take = DEFAULT_PAGE_SIZE
  }: {
    filters?: Filter[];
    skip?: number;
    sortColumn?: string;
    sortDirection?: Prisma.SortOrder;
    take?: number;
  }): Promise<AdminMarketData> {
    let orderBy: Prisma.Enumerable<Prisma.SymbolProfileOrderByWithRelationInput> =
      [{ symbol: 'asc' }];
    const where: Prisma.SymbolProfileWhereInput = {};

    const { ASSET_SUB_CLASS: filtersByAssetSubClass } = groupBy(
      filters,
      (filter) => {
        return filter.type;
      }
    );

    const marketDataItems = await this.prismaService.marketData.groupBy({
      _count: true,
      by: ['dataSource', 'symbol']
    });

    if (filtersByAssetSubClass) {
      where.assetSubClass = AssetSubClass[filtersByAssetSubClass[0].id];
    }

    if (sortColumn) {
      orderBy = [{ [sortColumn]: sortDirection }];
    }

    const [assetProfiles, count] = await Promise.all([
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
          dataSource: true,
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

    return {
      count,
      marketData: assetProfiles.map(
        ({
          _count,
          assetClass,
          assetSubClass,
          comment,
          countries,
          dataSource,
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
            countriesCount,
            dataSource,
            symbol,
            marketDataItemCount,
            sectorsCount,
            activitiesCount: _count.Order,
            date: Order?.[0]?.date
          };
        }
      )
    };
  }

  public async getMarketDataBySymbol({
    dataSource,
    symbol
  }: UniqueAsset): Promise<AdminMarketDataDetails> {
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

    return {
      marketData,
      assetProfile: assetProfile ?? {
        symbol,
        currency: '-'
      }
    };
  }

  public async patchAssetProfileData({
    comment,
    dataSource,
    symbol,
    symbolMapping
  }: Prisma.SymbolProfileUpdateInput & UniqueAsset) {
    await this.symbolProfileService.updateSymbolProfile({
      comment,
      dataSource,
      symbol,
      symbolMapping
    });

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

    if (key === PROPERTY_CURRENCIES) {
      await this.exchangeRateDataService.initialize();
    }

    return response;
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
        Subscription: true
      },
      take: 30
    });

    return usersWithAnalytics.map(
      ({ _count, Analytics, createdAt, id, Subscription }) => {
        const daysSinceRegistration =
          differenceInDays(new Date(), createdAt) + 1;
        const engagement = Analytics
          ? Analytics.activityCount / daysSinceRegistration
          : undefined;

        const subscription = this.configurationService.get(
          'ENABLE_FEATURE_SUBSCRIPTION'
        )
          ? this.subscriptionService.getSubscription(Subscription)
          : undefined;

        return {
          createdAt,
          engagement,
          id,
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
