import { SubscriptionService } from '@ghostfolio/api/app/subscription/subscription.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile.service';
import { PROPERTY_CURRENCIES } from '@ghostfolio/common/config';
import {
  AdminData,
  AdminMarketData,
  AdminMarketDataDetails,
  AdminMarketDataItem,
  Filter,
  UniqueAsset
} from '@ghostfolio/common/interfaces';
import { Injectable } from '@nestjs/common';
import { AssetSubClass, Prisma, Property } from '@prisma/client';
import { differenceInDays } from 'date-fns';
import { groupBy } from 'lodash';

@Injectable()
export class AdminService {
  private baseCurrency: string;

  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly marketDataService: MarketDataService,
    private readonly prismaService: PrismaService,
    private readonly propertyService: PropertyService,
    private readonly subscriptionService: SubscriptionService,
    private readonly symbolProfileService: SymbolProfileService
  ) {
    this.baseCurrency = this.configurationService.get('BASE_CURRENCY');
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

  public async getMarketData(filters?: Filter[]): Promise<AdminMarketData> {
    const where: Prisma.SymbolProfileWhereInput = {};

    const { ASSET_SUB_CLASS: filtersByAssetSubClass } = groupBy(
      filters,
      (filter) => {
        return filter.type;
      }
    );

    const marketData = await this.prismaService.marketData.groupBy({
      _count: true,
      by: ['dataSource', 'symbol']
    });

    let currencyPairsToGather: AdminMarketDataItem[] = [];

    if (filtersByAssetSubClass) {
      where.assetSubClass = AssetSubClass[filtersByAssetSubClass[0].id];
    } else {
      currencyPairsToGather = this.exchangeRateDataService
        .getCurrencyPairs()
        .map(({ dataSource, symbol }) => {
          const marketDataItemCount =
            marketData.find((marketDataItem) => {
              return (
                marketDataItem.dataSource === dataSource &&
                marketDataItem.symbol === symbol
              );
            })?._count ?? 0;

          return {
            dataSource,
            marketDataItemCount,
            symbol,
            countriesCount: 0,
            sectorsCount: 0
          };
        });
    }

    const symbolProfilesToGather: AdminMarketDataItem[] = (
      await this.prismaService.symbolProfile.findMany({
        where,
        orderBy: [{ symbol: 'asc' }],
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
      })
    ).map((symbolProfile) => {
      const countriesCount = symbolProfile.countries
        ? Object.keys(symbolProfile.countries).length
        : 0;
      const marketDataItemCount =
        marketData.find((marketDataItem) => {
          return (
            marketDataItem.dataSource === symbolProfile.dataSource &&
            marketDataItem.symbol === symbolProfile.symbol
          );
        })?._count ?? 0;
      const sectorsCount = symbolProfile.sectors
        ? Object.keys(symbolProfile.sectors).length
        : 0;

      return {
        countriesCount,
        marketDataItemCount,
        sectorsCount,
        activitiesCount: symbolProfile._count.Order,
        assetClass: symbolProfile.assetClass,
        assetSubClass: symbolProfile.assetSubClass,
        comment: symbolProfile.comment,
        dataSource: symbolProfile.dataSource,
        date: symbolProfile.Order?.[0]?.date,
        symbol: symbolProfile.symbol
      };
    });

    return {
      marketData: [...currencyPairsToGather, ...symbolProfilesToGather]
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
      assetProfile,
      marketData
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
    const usersWithAnalytics = await this.prismaService.user.findMany({
      orderBy: {
        Analytics: {
          updatedAt: 'desc'
        }
      },
      select: {
        _count: {
          select: { Account: true, Order: true }
        },
        Analytics: {
          select: {
            activityCount: true,
            updatedAt: true
          }
        },
        createdAt: true,
        id: true,
        Subscription: true
      },
      take: 30,
      where: {
        NOT: {
          Analytics: null
        }
      }
    });

    return usersWithAnalytics.map(
      ({ _count, Analytics, createdAt, id, Subscription }) => {
        const daysSinceRegistration =
          differenceInDays(new Date(), createdAt) + 1;
        const engagement = Analytics.activityCount / daysSinceRegistration;

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
          lastActivity: Analytics.updatedAt,
          transactionCount: _count.Order || 0
        };
      }
    );
  }
}
