import { AssetProfilesService } from '@ghostfolio/api/app/endpoints/asset-profiles/asset-profiles.service';
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
  ghostfolioPrefix,
  PROPERTY_CURRENCIES,
  PROPERTY_IS_READ_ONLY_MODE,
  PROPERTY_IS_USER_SIGNUP_ENABLED
} from '@ghostfolio/common/config';
import {
  applyAssetProfileOverrides,
  canMergeAssetProfile,
  getAssetProfileIdentifier,
  getCurrencyFromSymbol,
  hasGhostfolioPrefix
} from '@ghostfolio/common/helper';
import {
  AdminData,
  AdminUserResponse,
  AdminUsersResponse,
  AssetProfileIdentifier,
  EnhancedAssetProfile
} from '@ghostfolio/common/interfaces';
import { PropertyKey } from '@ghostfolio/common/types';

import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
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
  private readonly logger = new Logger(AdminService.name);

  public constructor(
    private readonly assetProfilesService: AssetProfilesService,
    private readonly benchmarkService: BenchmarkService,
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
        if (!hasGhostfolioPrefix(symbol)) {
          throw new BadRequestException(
            `symbol ("${symbol}") must start with the prefix "${ghostfolioPrefix}_" for the data source ("${dataSource}")`
          );
        }

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

    const customCurrencies = await this.propertyService.getByKey<string[]>(
      PROPERTY_CURRENCIES,
      { skipCache: true }
    );

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

  /**
   * Merges the source asset profile into the target asset profile. The
   * activities, the watchlist entries and the market data which is missing
   * there are moved to the target asset profile. The metadata and the splits
   * of the source asset profile are discarded, because the target asset
   * profile is the authoritative one. Then the source asset profile is deleted
   * and the market data of the target asset profile is gathered again.
   */
  public async mergeAssetProfile(
    sourceAssetProfileIdentifier: AssetProfileIdentifier,
    targetAssetProfileIdentifier: AssetProfileIdentifier
  ): Promise<EnhancedAssetProfile> {
    if (
      getAssetProfileIdentifier(sourceAssetProfileIdentifier) ===
      getAssetProfileIdentifier(targetAssetProfileIdentifier)
    ) {
      throw new BadRequestException(
        'The source and the target asset profile must be different'
      );
    }

    // The rules of the symbol apply to both asset profiles and are examined
    // first. The remaining rules apply to the source asset profile only,
    // because the merge deletes it
    for (const assetProfileIdentifier of [
      sourceAssetProfileIdentifier,
      targetAssetProfileIdentifier
    ]) {
      if (!canMergeAssetProfile(assetProfileIdentifier)) {
        throw new BadRequestException(
          `The asset profile ${getAssetProfileIdentifier(assetProfileIdentifier)} cannot be merged`
        );
      }
    }

    const [sourceAssetProfile, targetAssetProfile] = await Promise.all([
      this.prismaService.symbolProfile.findUnique({
        include: { watchedBy: { select: { id: true } } },
        where: {
          dataSource_symbol: {
            dataSource: sourceAssetProfileIdentifier.dataSource,
            symbol: sourceAssetProfileIdentifier.symbol
          }
        }
      }),
      this.prismaService.symbolProfile.findUnique({
        include: { watchedBy: { select: { id: true } } },
        where: {
          dataSource_symbol: {
            dataSource: targetAssetProfileIdentifier.dataSource,
            symbol: targetAssetProfileIdentifier.symbol
          }
        }
      })
    ]);

    if (!sourceAssetProfile || !targetAssetProfile) {
      throw new NotFoundException(
        'The source or the target asset profile does not exist'
      );
    }

    // An activity without a currency inherits the currency of its asset
    // profile, hence a merge into an asset profile with another currency
    // would change the value of the moved activities
    if (sourceAssetProfile.currency !== targetAssetProfile.currency) {
      throw new BadRequestException(
        `The currency of the source asset profile (${sourceAssetProfile.currency}) does not match the currency of the target asset profile (${targetAssetProfile.currency})`
      );
    }

    // A user asset profile must not become accessible to another user and a
    // user must not become unable to be deleted, because the activities of the
    // source asset profile would keep a reference to it
    if (sourceAssetProfile.userId !== targetAssetProfile.userId) {
      throw new BadRequestException(
        'The source and the target asset profile must belong to the same user'
      );
    }

    const [benchmarkAssetProfiles, splitsCount] = await Promise.all([
      this.benchmarkService.getBenchmarkAssetProfiles(),
      this.prismaService.assetProfileSplit.count({
        where: { symbolProfileId: sourceAssetProfile.id }
      })
    ]);

    // A benchmark and a split are referenced by the id of the asset profile,
    // which the merge deletes. A benchmark is referenced globally and in the
    // settings of every user. A split adjusts every activity of its asset
    // profile, thus copying it would adjust the activities which the target
    // asset profile already has and discarding it would remove the adjustment
    // of the moved activities.
    const isBenchmark = benchmarkAssetProfiles.some(({ id }) => {
      return id === sourceAssetProfile.id;
    });

    if (
      !canMergeAssetProfile({
        isBenchmark,
        splitsCount,
        symbol: sourceAssetProfileIdentifier.symbol
      })
    ) {
      throw new BadRequestException(
        `The asset profile ${getAssetProfileIdentifier(sourceAssetProfileIdentifier)} cannot be merged. Remove its benchmark and its splits before the merge.`
      );
    }

    const marketDataItems = await this.prismaService.marketData.findMany({
      select: { date: true, marketPrice: true, state: true },
      where: {
        dataSource: sourceAssetProfileIdentifier.dataSource,
        symbol: sourceAssetProfileIdentifier.symbol
      }
    });

    const operations: Prisma.PrismaPromise<unknown>[] = [
      this.prismaService.order.updateMany({
        data: { symbolProfileId: targetAssetProfile.id },
        where: { symbolProfileId: sourceAssetProfile.id }
      }),
      this.prismaService.symbolProfile.update({
        data: {
          watchedBy: {
            connect: sourceAssetProfile.watchedBy.map(({ id }) => {
              return { id };
            })
          }
        },
        where: { id: targetAssetProfile.id }
      }),
      this.prismaService.marketData.createMany({
        data: marketDataItems.map(({ date, marketPrice, state }) => {
          return {
            date,
            marketPrice,
            state,
            dataSource: targetAssetProfileIdentifier.dataSource,
            symbol: targetAssetProfileIdentifier.symbol
          };
        }),
        skipDuplicates: true
      }),
      // The market data has no relation to the asset profile and is therefore
      // not deleted in cascade
      this.prismaService.marketData.deleteMany({
        where: {
          dataSource: sourceAssetProfileIdentifier.dataSource,
          symbol: sourceAssetProfileIdentifier.symbol
        }
      }),
      this.prismaService.symbolProfile.delete({
        where: { id: sourceAssetProfile.id }
      })
    ];

    const mergeDescription = `${getAssetProfileIdentifier(
      sourceAssetProfileIdentifier
    )} into ${getAssetProfileIdentifier(targetAssetProfileIdentifier)}`;

    try {
      await this.prismaService.$transaction(operations);
    } catch (error) {
      this.logger.error(
        `Could not merge the asset profile ${mergeDescription}`,
        error.stack
      );

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new ConflictException(
          `The asset profile ${mergeDescription} could not be merged, because it has been changed in the meantime`
        );
      }

      throw new InternalServerErrorException(
        `The asset profile ${mergeDescription} could not be merged`
      );
    }

    // The merge is committed at this point. The gathering of the market data
    // only updates derived data, thus an error must not fail the request.
    // Otherwise the admin would retry a merge which has already been done.
    try {
      // The activities now refer to the market data of the target asset
      // profile, hence the portfolio snapshots are already wrong and are
      // invalidated immediately. The market data is not gathered with force,
      // because a forced gathering deletes the market data of the days which
      // the data provider does not return, including the days which have been
      // copied from the source asset profile.
      await this.assetProfilesService.gatherSymbolAndEmitPortfolioChangedEvents(
        {
          ...targetAssetProfileIdentifier,
          force: false,
          symbolProfileId: targetAssetProfile.id,
          withImmediateInvalidation: true
        }
      );
    } catch (error) {
      this.logger.error(
        `The asset profile ${mergeDescription} has been merged, but the market data could not be gathered`,
        error.stack
      );
    }

    const [mergedAssetProfile] =
      await this.symbolProfileService.getSymbolProfiles([
        targetAssetProfileIdentifier
      ]);

    if (!mergedAssetProfile) {
      throw new NotFoundException(
        `The asset profile ${getAssetProfileIdentifier(targetAssetProfileIdentifier)} does not exist`
      );
    }

    return mergedAssetProfile;
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
