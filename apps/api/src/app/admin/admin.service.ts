import { SubscriptionService } from '@ghostfolio/api/app/subscription/subscription.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { DataGatheringService } from '@ghostfolio/api/services/data-gathering.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import { PROPERTY_CURRENCIES, baseCurrency } from '@ghostfolio/common/config';
import {
  AdminData,
  AdminMarketData,
  AdminMarketDataDetails,
  AdminMarketDataItem
} from '@ghostfolio/common/interfaces';
import { Injectable } from '@nestjs/common';
import { Property } from '@prisma/client';
import { differenceInDays } from 'date-fns';

@Injectable()
export class AdminService {
  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly dataGatheringService: DataGatheringService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly marketDataService: MarketDataService,
    private readonly prismaService: PrismaService,
    private readonly propertyService: PropertyService,
    private readonly subscriptionService: SubscriptionService
  ) {}

  public async get(): Promise<AdminData> {
    return {
      dataGatheringProgress:
        await this.dataGatheringService.getDataGatheringProgress(),
      exchangeRates: this.exchangeRateDataService
        .getCurrencies()
        .filter((currency) => {
          return currency !== baseCurrency;
        })
        .map((currency) => {
          return {
            label1: baseCurrency,
            label2: currency,
            value: this.exchangeRateDataService.toCurrency(
              1,
              baseCurrency,
              currency
            )
          };
        }),
      lastDataGathering: await this.getLastDataGathering(),
      settings: await this.propertyService.get(),
      transactionCount: await this.prismaService.order.count(),
      userCount: await this.prismaService.user.count(),
      users: await this.getUsersWithAnalytics()
    };
  }

  public async getMarketData(): Promise<AdminMarketData> {
    const marketData = await this.prismaService.marketData.groupBy({
      _count: true,
      by: ['dataSource', 'symbol']
    });

    const currencyPairsToGather: AdminMarketDataItem[] =
      this.exchangeRateDataService
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
            symbol
          };
        });

    const symbolProfilesToGather: AdminMarketDataItem[] = (
      await this.prismaService.symbolProfile.findMany({
        orderBy: [{ symbol: 'asc' }],
        select: {
          _count: {
            select: { Order: true }
          },
          dataSource: true,
          Order: {
            orderBy: [{ date: 'asc' }],
            select: { date: true },
            take: 1
          },
          scraperConfiguration: true,
          symbol: true
        }
      })
    ).map((symbolProfile) => {
      const marketDataItemCount =
        marketData.find((marketDataItem) => {
          return (
            marketDataItem.dataSource === symbolProfile.dataSource &&
            marketDataItem.symbol === symbolProfile.symbol
          );
        })?._count ?? 0;

      return {
        marketDataItemCount,
        activityCount: symbolProfile._count.Order,
        dataSource: symbolProfile.dataSource,
        date: symbolProfile.Order?.[0]?.date,
        symbol: symbolProfile.symbol
      };
    });

    return {
      marketData: [...currencyPairsToGather, ...symbolProfilesToGather]
    };
  }

  public async getMarketDataBySymbol(
    aSymbol: string
  ): Promise<AdminMarketDataDetails> {
    return {
      marketData: await this.marketDataService.marketDataItems({
        orderBy: {
          date: 'asc'
        },
        where: {
          symbol: aSymbol
        }
      })
    };
  }

  public async putSetting(key: string, value: string) {
    let response: Property;

    if (value === '') {
      response = await this.propertyService.delete({ key });
    } else {
      response = await this.propertyService.put({ key, value });
    }

    if (key === PROPERTY_CURRENCIES) {
      await this.exchangeRateDataService.initialize();
      await this.dataGatheringService.reset();
    }

    return response;
  }

  private async getLastDataGathering() {
    const lastDataGathering =
      await this.dataGatheringService.getLastDataGathering();

    if (lastDataGathering) {
      return lastDataGathering;
    }

    const dataGatheringInProgress =
      await this.dataGatheringService.getIsInProgress();

    if (dataGatheringInProgress) {
      return 'IN_PROGRESS';
    }

    return undefined;
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
        alias: true,
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
      ({ _count, alias, Analytics, createdAt, id, Subscription }) => {
        const daysSinceRegistration =
          differenceInDays(new Date(), createdAt) + 1;
        const engagement = Analytics.activityCount / daysSinceRegistration;

        const subscription = this.configurationService.get(
          'ENABLE_FEATURE_SUBSCRIPTION'
        )
          ? this.subscriptionService.getSubscription(Subscription)
          : undefined;

        return {
          alias,
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
