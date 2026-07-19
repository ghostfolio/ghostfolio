import { environment } from '@ghostfolio/api/environments/environment';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import {
  PROPERTY_CURRENCIES,
  PROPERTY_IS_READ_ONLY_MODE,
  PROPERTY_IS_USER_SIGNUP_ENABLED
} from '@ghostfolio/common/config';
import {
  applyAssetProfileOverrides,
  getAssetProfileIdentifier,
  getCurrencyFromSymbol
} from '@ghostfolio/common/helper';
import {
  AdminData,
  AdminUserResponse,
  AdminUsersResponse,
  AssetProfileIdentifier
} from '@ghostfolio/common/interfaces';
import { PropertyKey } from '@ghostfolio/common/types';

import {
  BadRequestException,
  HttpException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {
  AssetClass,
  AssetSubClass,
  DataSource,
  Prisma,
  Property,
  SymbolProfile
} from '@prisma/client';
import { differenceInDays } from 'date-fns';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';
import { randomUUID } from 'node:crypto';

@Injectable()
export class AdminService {
  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly dataProviderService: DataProviderService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly marketDataService: MarketDataService,
    private readonly prismaService: PrismaService,
    private readonly propertyService: PropertyService,
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

      const assetProfile =
        assetProfiles[getAssetProfileIdentifier({ dataSource, symbol })];

      if (!assetProfile?.currency) {
        throw new BadRequestException(
          `Asset profile not found for ${symbol} (${dataSource})`
        );
      }

      return this.symbolProfileService.add(
        assetProfile as Prisma.SymbolProfileCreateInput
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
    const customCurrencies =
      await this.propertyService.getByKey<string[]>(PROPERTY_CURRENCIES);

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
    const dataSources = Object.values(DataSource);

    const [activitiesCount, enabledDataSources, settings, userCount] =
      await Promise.all([
        this.prismaService.order.count(),
        this.dataProviderService.getDataSources(),
        this.propertyService.get(),
        this.countUsersWithAnalytics()
      ]);

    const dataProviders = (
      await Promise.all(
        dataSources.map(async (dataSource) => {
          const assetProfileCount =
            await this.prismaService.symbolProfile.count({
              where: {
                dataSource
              }
            });

          const isEnabled = enabledDataSources.includes(dataSource);

          if (
            assetProfileCount > 0 ||
            dataSource === 'GHOSTFOLIO' ||
            isEnabled
          ) {
            const dataProviderInfo = this.dataProviderService
              .getDataProvider(dataSource)
              .getDataProviderInfo();

            return {
              ...dataProviderInfo,
              assetProfileCount,
              useForExchangeRates:
                dataSource ===
                this.dataProviderService.getDataSourceForExchangeRates()
            };
          }

          return null;
        })
      )
    ).filter(Boolean);

    return {
      activitiesCount,
      dataProviders,
      settings,
      userCount,
      version: environment.version
    };
  }

  public async getUser(id: string): Promise<AdminUserResponse> {
    const [user] = await this.getUsersWithAnalytics({
      where: { id }
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION')) {
      user.subscriptions = await this.prismaService.subscription.findMany({
        orderBy: {
          expiresAt: 'desc'
        },
        where: {
          userId: id
        }
      });
    }

    return user;
  }

  public async getUsers({
    skip,
    take = Number.MAX_SAFE_INTEGER
  }: {
    skip?: number;
    take?: number;
  }): Promise<AdminUsersResponse> {
    const [count, users] = await Promise.all([
      this.countUsersWithAnalytics(),
      this.getUsersWithAnalytics({
        skip,
        take
      })
    ]);

    return { count, users };
  }

  public async patchAssetProfileData(
    { dataSource, symbol }: AssetProfileIdentifier,
    {
      assetClass,
      assetSubClass,
      comment,
      countries,
      currency,
      dataGatheringFrequency,
      dataSource: newDataSource,
      holdings,
      isActive,
      name,
      scraperConfiguration,
      sectors,
      symbol: newSymbol,
      symbolMapping,
      url
    }: Prisma.SymbolProfileUpdateInput
  ) {
    const isConversionToManualDataSource =
      newDataSource === DataSource.MANUAL && dataSource !== DataSource.MANUAL;

    if (isConversionToManualDataSource && !newSymbol) {
      newSymbol = randomUUID();
    }

    if (
      newDataSource &&
      newSymbol &&
      (newDataSource !== dataSource || newSymbol !== symbol)
    ) {
      const newAssetProfileIdentifier: AssetProfileIdentifier = {
        dataSource: newDataSource as DataSource,
        symbol: newSymbol as string
      };

      const [assetProfile] = await this.symbolProfileService.getSymbolProfiles([
        newAssetProfileIdentifier
      ]);

      if (assetProfile) {
        throw new HttpException(
          getReasonPhrase(StatusCodes.CONFLICT),
          StatusCodes.CONFLICT
        );
      }

      const operations: Prisma.PrismaPromise<unknown>[] = [
        this.symbolProfileService.updateAssetProfileIdentifier(
          {
            dataSource,
            symbol
          },
          newAssetProfileIdentifier
        ),
        this.marketDataService.updateAssetProfileIdentifier(
          {
            dataSource,
            symbol
          },
          newAssetProfileIdentifier
        )
      ];

      if (isConversionToManualDataSource) {
        const currentAssetProfile =
          await this.prismaService.symbolProfile.findUnique({
            include: { assetProfileOverrides: true },
            where: { dataSource_symbol: { dataSource, symbol } }
          });

        if (!currentAssetProfile) {
          throw new HttpException(
            getReasonPhrase(StatusCodes.NOT_FOUND),
            StatusCodes.NOT_FOUND
          );
        }

        const currentAssetProfileWithOverrides = applyAssetProfileOverrides(
          currentAssetProfile,
          currentAssetProfile.assetProfileOverrides
        );

        operations.push(
          // The overrides are applied on every read, so delete them and
          // persist the merged values in the asset profile instead
          this.symbolProfileService.deleteAssetProfileOverrides(
            newAssetProfileIdentifier
          ),
          this.symbolProfileService.updateSymbolProfile(
            newAssetProfileIdentifier,
            {
              assetClass: currentAssetProfileWithOverrides.assetClass,
              assetSubClass: currentAssetProfileWithOverrides.assetSubClass,
              countries:
                currentAssetProfileWithOverrides.countries ?? undefined,
              holdings: currentAssetProfileWithOverrides.holdings ?? undefined,
              name: currentAssetProfileWithOverrides.name,
              sectors: currentAssetProfileWithOverrides.sectors ?? undefined,
              url: currentAssetProfileWithOverrides.url
            }
          )
        );
      }

      try {
        await this.prismaService.$transaction(operations);
      } catch {
        throw new HttpException(
          getReasonPhrase(StatusCodes.BAD_REQUEST),
          StatusCodes.BAD_REQUEST
        );
      }

      const [updatedAssetProfile] =
        await this.symbolProfileService.getSymbolProfiles([
          newAssetProfileIdentifier
        ]);

      return updatedAssetProfile;
    } else {
      const assetProfileOverrides = {
        assetClass: assetClass as AssetClass,
        assetSubClass: assetSubClass as AssetSubClass,
        countries: countries as Prisma.JsonArray,
        holdings: holdings as Prisma.JsonArray,
        name: name as string,
        sectors: sectors as Prisma.JsonArray,
        url: url as string
      };

      const updatedSymbolProfile: Prisma.SymbolProfileUpdateInput = {
        comment,
        currency,
        dataGatheringFrequency,
        dataSource,
        isActive,
        scraperConfiguration,
        symbol,
        symbolMapping,
        ...this.symbolProfileService.getAssetProfileUpdateInput(
          { dataSource, symbol },
          assetProfileOverrides
        )
      };

      await this.symbolProfileService.updateSymbolProfile(
        {
          dataSource,
          symbol
        },
        updatedSymbolProfile
      );

      const [updatedAssetProfile] =
        await this.symbolProfileService.getSymbolProfiles([
          {
            dataSource: dataSource as DataSource,
            symbol: symbol as string
          }
        ]);

      return updatedAssetProfile;
    }
  }

  public async putSetting(key: PropertyKey, value: string) {
    let response: Property;

    if (value) {
      response = await this.propertyService.put({
        key,
        value
      });
    } else {
      response = await this.propertyService.delete({
        key
      });
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
          analytics: null
        }
      };
    }

    return this.prismaService.user.count({
      where
    });
  }

  private async getUsersWithAnalytics({
    skip,
    take,
    where
  }: {
    skip?: number;
    take?: number;
    where?: Prisma.UserWhereInput;
  }): Promise<AdminUsersResponse['users']> {
    let orderBy: Prisma.Enumerable<Prisma.UserOrderByWithRelationInput> = [
      { createdAt: 'desc' }
    ];

    if (this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION')) {
      orderBy = [
        {
          analytics: {
            lastRequestAt: 'desc'
          }
        }
      ];

      const noAnalyticsCondition: Prisma.UserWhereInput['NOT'] = {
        analytics: null
      };

      if (where) {
        if (where.NOT) {
          where.NOT = { ...where.NOT, ...noAnalyticsCondition };
        } else {
          where.NOT = noAnalyticsCondition;
        }
      } else {
        where = { NOT: noAnalyticsCondition };
      }
    }

    const usersWithAnalytics = await this.prismaService.user.findMany({
      skip,
      take,
      where,
      orderBy: [...orderBy, { id: 'desc' }],
      select: {
        _count: {
          select: { accounts: true, activities: true }
        },
        analytics: {
          select: {
            activityCount: true,
            country: true,
            dataProviderGhostfolioDailyRequests: true,
            lastRequestAt: true
          }
        },
        createdAt: true,
        id: true,
        provider: true,
        role: true,
        subscriptions: {
          orderBy: {
            expiresAt: 'desc'
          },
          take: 1,
          where: {
            expiresAt: {
              gt: new Date()
            }
          }
        }
      }
    });

    return usersWithAnalytics.map(
      ({ _count, analytics, createdAt, id, provider, role, subscriptions }) => {
        const daysSinceRegistration =
          differenceInDays(new Date(), createdAt) + 1;
        const engagement = analytics
          ? analytics.activityCount / daysSinceRegistration
          : undefined;

        const subscription =
          this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION') &&
          subscriptions?.length > 0
            ? subscriptions[0]
            : undefined;

        return {
          createdAt,
          engagement,
          id,
          provider,
          role,
          subscription,
          accountCount: _count.accounts || 0,
          activityCount: _count.activities || 0,
          country: analytics?.country,
          dailyApiRequests: analytics?.dataProviderGhostfolioDailyRequests || 0,
          lastActivity: analytics?.lastRequestAt
        };
      }
    );
  }
}
