import { OrderService } from '@ghostfolio/api/app/order/order.service';
import { SubscriptionService } from '@ghostfolio/api/app/subscription/subscription.service';
import { environment } from '@ghostfolio/api/environments/environment';
import { PortfolioChangedEvent } from '@ghostfolio/api/events/portfolio-changed.event';
import { getRandomString } from '@ghostfolio/api/helper/string.helper';
import { AccountClusterRiskCurrentInvestment } from '@ghostfolio/api/models/rules/account-cluster-risk/current-investment';
import { AccountClusterRiskSingleAccount } from '@ghostfolio/api/models/rules/account-cluster-risk/single-account';
import { AssetClassClusterRiskEquity } from '@ghostfolio/api/models/rules/asset-class-cluster-risk/equity';
import { AssetClassClusterRiskFixedIncome } from '@ghostfolio/api/models/rules/asset-class-cluster-risk/fixed-income';
import { CurrencyClusterRiskBaseCurrencyCurrentInvestment } from '@ghostfolio/api/models/rules/currency-cluster-risk/base-currency-current-investment';
import { CurrencyClusterRiskCurrentInvestment } from '@ghostfolio/api/models/rules/currency-cluster-risk/current-investment';
import { EconomicMarketClusterRiskDevelopedMarkets } from '@ghostfolio/api/models/rules/economic-market-cluster-risk/developed-markets';
import { EconomicMarketClusterRiskEmergingMarkets } from '@ghostfolio/api/models/rules/economic-market-cluster-risk/emerging-markets';
import { EmergencyFundSetup } from '@ghostfolio/api/models/rules/emergency-fund/emergency-fund-setup';
import { FeeRatioInitialInvestment } from '@ghostfolio/api/models/rules/fees/fee-ratio-initial-investment';
import { RegionalMarketClusterRiskAsiaPacific } from '@ghostfolio/api/models/rules/regional-market-cluster-risk/asia-pacific';
import { RegionalMarketClusterRiskEmergingMarkets } from '@ghostfolio/api/models/rules/regional-market-cluster-risk/emerging-markets';
import { RegionalMarketClusterRiskEurope } from '@ghostfolio/api/models/rules/regional-market-cluster-risk/europe';
import { RegionalMarketClusterRiskJapan } from '@ghostfolio/api/models/rules/regional-market-cluster-risk/japan';
import { RegionalMarketClusterRiskNorthAmerica } from '@ghostfolio/api/models/rules/regional-market-cluster-risk/north-america';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { I18nService } from '@ghostfolio/api/services/i18n/i18n.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import { TagService } from '@ghostfolio/api/services/tag/tag.service';
import {
  DEFAULT_CURRENCY,
  DEFAULT_LANGUAGE_CODE,
  PROPERTY_IS_READ_ONLY_MODE,
  PROPERTY_SYSTEM_MESSAGE,
  locale
} from '@ghostfolio/common/config';
import {
  User as IUser,
  SystemMessage,
  UserSettings
} from '@ghostfolio/common/interfaces';
import {
  getPermissions,
  hasRole,
  permissions
} from '@ghostfolio/common/permissions';
import { UserWithSettings } from '@ghostfolio/common/types';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma, Role, User } from '@prisma/client';
import { createHmac } from 'crypto';
import { differenceInDays, subDays } from 'date-fns';
import { sortBy, without } from 'lodash';

@Injectable()
export class UserService {
  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly eventEmitter: EventEmitter2,
    private readonly i18nService: I18nService,
    private readonly orderService: OrderService,
    private readonly prismaService: PrismaService,
    private readonly propertyService: PropertyService,
    private readonly subscriptionService: SubscriptionService,
    private readonly tagService: TagService
  ) {}

  public async count(args?: Prisma.UserCountArgs) {
    return this.prismaService.user.count(args);
  }

  public createAccessToken({
    password,
    salt
  }: {
    password: string;
    salt: string;
  }): string {
    const hash = createHmac('sha512', salt);
    hash.update(password);

    return hash.digest('hex');
  }

  public generateAccessToken({ userId }: { userId: string }) {
    const accessToken = this.createAccessToken({
      password: userId,
      salt: getRandomString(10)
    });

    const hashedAccessToken = this.createAccessToken({
      password: accessToken,
      salt: this.configurationService.get('ACCESS_TOKEN_SALT')
    });

    return { accessToken, hashedAccessToken };
  }

  public async getUser(
    { accounts, id, permissions, settings, subscription }: UserWithSettings,
    aLocale = locale
  ): Promise<IUser> {
    const userData = await Promise.all([
      this.prismaService.access.findMany({
        include: {
          user: true
        },
        orderBy: { alias: 'asc' },
        where: { granteeUserId: id }
      }),
      this.prismaService.order.count({
        where: { userId: id }
      }),
      this.prismaService.order.findFirst({
        orderBy: {
          date: 'asc'
        },
        where: { userId: id }
      }),
      this.tagService.getTagsForUser(id)
    ]);

    const access = userData[0];
    const activitiesCount = userData[1];
    const firstActivity = userData[2];
    let tags = userData[3];

    let systemMessage: SystemMessage;

    const systemMessageProperty =
      await this.propertyService.getByKey<SystemMessage>(
        PROPERTY_SYSTEM_MESSAGE
      );

    if (systemMessageProperty?.targetGroups?.includes(subscription?.type)) {
      systemMessage = systemMessageProperty;
    }

    if (
      this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION') &&
      subscription.type === 'Basic'
    ) {
      tags = [];
    }

    return {
      accounts,
      activitiesCount,
      id,
      permissions,
      subscription,
      systemMessage,
      tags,
      access: access.map((accessItem) => {
        return {
          alias: accessItem.alias,
          id: accessItem.id,
          permissions: accessItem.permissions
        };
      }),
      dateOfFirstActivity: firstActivity?.date ?? new Date(),
      settings: {
        ...(settings.settings as UserSettings),
        locale: (settings.settings as UserSettings)?.locale ?? aLocale
      }
    };
  }

  public async hasAdmin() {
    const usersWithAdminRole = await this.users({
      where: {
        role: {
          equals: 'ADMIN'
        }
      }
    });

    return usersWithAdminRole.length > 0;
  }

  public async user(
    userWhereUniqueInput: Prisma.UserWhereUniqueInput
  ): Promise<UserWithSettings | null> {
    const {
      accessesGet,
      accessToken,
      accounts,
      analytics,
      authChallenge,
      createdAt,
      id,
      provider,
      role,
      settings,
      subscriptions,
      thirdPartyId,
      updatedAt
    } = await this.prismaService.user.findUnique({
      include: {
        accessesGet: true,
        accounts: {
          include: { platform: true }
        },
        analytics: true,
        settings: true,
        subscriptions: true
      },
      where: userWhereUniqueInput
    });

    const user: UserWithSettings = {
      accessesGet,
      accessToken,
      accounts,
      authChallenge,
      createdAt,
      id,
      provider,
      role,
      settings: settings as UserWithSettings['settings'],
      thirdPartyId,
      updatedAt,
      activityCount: analytics?.activityCount,
      dataProviderGhostfolioDailyRequests:
        analytics?.dataProviderGhostfolioDailyRequests
    };

    if (user?.settings) {
      if (!user.settings.settings) {
        user.settings.settings = {};
      }
    } else if (user) {
      // Set default settings if needed
      user.settings = {
        settings: {},
        updatedAt: new Date(),
        userId: user?.id
      };
    }

    // Set default value for base currency
    if (!(user.settings.settings as UserSettings)?.baseCurrency) {
      (user.settings.settings as UserSettings).baseCurrency = DEFAULT_CURRENCY;
    }

    // Set default value for date range
    (user.settings.settings as UserSettings).dateRange =
      (user.settings.settings as UserSettings).viewMode === 'ZEN'
        ? 'max'
        : ((user.settings.settings as UserSettings)?.dateRange ?? 'max');

    // Set default value for performance calculation type
    if (!(user.settings.settings as UserSettings)?.performanceCalculationType) {
      (user.settings.settings as UserSettings).performanceCalculationType =
        PerformanceCalculationType.ROAI;
    }

    // Set default value for view mode
    if (!(user.settings.settings as UserSettings).viewMode) {
      (user.settings.settings as UserSettings).viewMode = 'DEFAULT';
    }

    (user.settings.settings as UserSettings).xRayRules = {
      AccountClusterRiskCurrentInvestment:
        new AccountClusterRiskCurrentInvestment(
          undefined,
          undefined,
          undefined,
          {}
        ).getSettings(user.settings.settings),
      AccountClusterRiskSingleAccount: new AccountClusterRiskSingleAccount(
        undefined,
        undefined,
        undefined,
        {}
      ).getSettings(user.settings.settings),
      AssetClassClusterRiskEquity: new AssetClassClusterRiskEquity(
        undefined,
        undefined,
        undefined,
        undefined
      ).getSettings(user.settings.settings),
      AssetClassClusterRiskFixedIncome: new AssetClassClusterRiskFixedIncome(
        undefined,
        undefined,
        undefined,
        undefined
      ).getSettings(user.settings.settings),
      CurrencyClusterRiskBaseCurrencyCurrentInvestment:
        new CurrencyClusterRiskBaseCurrencyCurrentInvestment(
          undefined,
          undefined,
          undefined,
          undefined
        ).getSettings(user.settings.settings),
      CurrencyClusterRiskCurrentInvestment:
        new CurrencyClusterRiskCurrentInvestment(
          undefined,
          undefined,
          undefined,
          undefined
        ).getSettings(user.settings.settings),
      EconomicMarketClusterRiskDevelopedMarkets:
        new EconomicMarketClusterRiskDevelopedMarkets(
          undefined,
          undefined,
          undefined
        ).getSettings(user.settings.settings),
      EconomicMarketClusterRiskEmergingMarkets:
        new EconomicMarketClusterRiskEmergingMarkets(
          undefined,
          undefined,
          undefined
        ).getSettings(user.settings.settings),
      EmergencyFundSetup: new EmergencyFundSetup(
        undefined,
        undefined,
        undefined,
        undefined
      ).getSettings(user.settings.settings),
      FeeRatioInitialInvestment: new FeeRatioInitialInvestment(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
      ).getSettings(user.settings.settings),
      RegionalMarketClusterRiskAsiaPacific:
        new RegionalMarketClusterRiskAsiaPacific(
          undefined,
          undefined,
          undefined
        ).getSettings(user.settings.settings),
      RegionalMarketClusterRiskEmergingMarkets:
        new RegionalMarketClusterRiskEmergingMarkets(
          undefined,
          undefined,
          undefined
        ).getSettings(user.settings.settings),
      RegionalMarketClusterRiskEurope: new RegionalMarketClusterRiskEurope(
        undefined,
        undefined,
        undefined
      ).getSettings(user.settings.settings),
      RegionalMarketClusterRiskJapan: new RegionalMarketClusterRiskJapan(
        undefined,
        undefined,
        undefined
      ).getSettings(user.settings.settings),
      RegionalMarketClusterRiskNorthAmerica:
        new RegionalMarketClusterRiskNorthAmerica(
          undefined,
          undefined,
          undefined
        ).getSettings(user.settings.settings)
    };

    let currentPermissions = getPermissions(user.role);

    if (user.provider === 'ANONYMOUS') {
      currentPermissions.push(permissions.deleteOwnUser);
      currentPermissions.push(permissions.updateOwnAccessToken);
    }

    if (!(user.settings.settings as UserSettings).isExperimentalFeatures) {
      // currentPermissions = without(
      //   currentPermissions,
      //   permissions.xyz
      // );
    }

    if (this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION')) {
      user.subscription = await this.subscriptionService.getSubscription({
        subscriptions,
        createdAt: user.createdAt
      });

      if (user.subscription?.type === 'Basic') {
        const daysSinceRegistration = differenceInDays(
          new Date(),
          user.createdAt
        );
        let frequency = 7;

        if (daysSinceRegistration > 720) {
          frequency = 1;
        } else if (daysSinceRegistration > 360) {
          frequency = 2;
        } else if (daysSinceRegistration > 180) {
          frequency = 3;
        } else if (daysSinceRegistration > 60) {
          frequency = 4;
        } else if (daysSinceRegistration > 30) {
          frequency = 5;
        } else if (daysSinceRegistration > 15) {
          frequency = 6;
        }

        if (analytics?.activityCount % frequency === 1) {
          currentPermissions.push(permissions.enableSubscriptionInterstitial);
        }

        currentPermissions = without(
          currentPermissions,
          permissions.accessHoldingsChart,
          permissions.createAccess,
          permissions.createMarketDataOfOwnAssetProfile,
          permissions.createOwnTag,
          permissions.createWatchlistItem,
          permissions.readAiPrompt,
          permissions.readMarketDataOfOwnAssetProfile,
          permissions.updateMarketDataOfOwnAssetProfile
        );

        // Reset benchmark
        user.settings.settings.benchmark = undefined;

        // Reset holdings view mode
        user.settings.settings.holdingsViewMode = undefined;
      } else if (user.subscription?.type === 'Premium') {
        if (!hasRole(user, Role.DEMO)) {
          currentPermissions.push(permissions.createApiKey);
          currentPermissions.push(permissions.enableDataProviderGhostfolio);
          currentPermissions.push(permissions.readMarketDataOfMarkets);
          currentPermissions.push(permissions.reportDataGlitch);
        }

        currentPermissions = without(
          currentPermissions,
          permissions.deleteOwnUser
        );

        // Reset offer
        user.subscription.offer.coupon = undefined;
        user.subscription.offer.couponId = undefined;
        user.subscription.offer.durationExtension = undefined;
        user.subscription.offer.label = undefined;
      }

      if (hasRole(user, Role.ADMIN)) {
        currentPermissions.push(permissions.syncDemoUserAccount);
      }
    }

    if (this.configurationService.get('ENABLE_FEATURE_READ_ONLY_MODE')) {
      if (hasRole(user, Role.ADMIN)) {
        currentPermissions.push(permissions.toggleReadOnlyMode);
      }

      const isReadOnlyMode = await this.propertyService.getByKey<boolean>(
        PROPERTY_IS_READ_ONLY_MODE
      );

      if (isReadOnlyMode) {
        currentPermissions = currentPermissions.filter((permission) => {
          return !(
            permission.startsWith('create') ||
            permission.startsWith('delete') ||
            permission.startsWith('update')
          );
        });
      }
    }

    if (!environment.production && hasRole(user, Role.ADMIN)) {
      currentPermissions.push(permissions.impersonateAllUsers);
    }

    user.accounts = sortBy(user.accounts, ({ name }) => {
      return name.toLowerCase();
    });
    user.permissions = currentPermissions.sort();

    return user;
  }

  public async users(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.UserWhereUniqueInput;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<User[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prismaService.user.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy
    });
  }

  public async createUser({
    data
  }: {
    data: Prisma.UserCreateInput;
  }): Promise<User> {
    if (!data?.provider) {
      data.provider = 'ANONYMOUS';
    }

    const user = await this.prismaService.user.create({
      data: {
        ...data,
        accounts: {
          create: {
            currency: DEFAULT_CURRENCY,
            name: this.i18nService.getTranslation({
              id: 'myAccount',
              languageCode: DEFAULT_LANGUAGE_CODE // TODO
            })
          }
        },
        settings: {
          create: {
            settings: {
              currency: DEFAULT_CURRENCY
            }
          }
        }
      }
    });

    if (this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION')) {
      await this.prismaService.analytics.create({
        data: {
          user: { connect: { id: user.id } }
        }
      });
    }

    if (data.provider === 'ANONYMOUS') {
      const { accessToken, hashedAccessToken } = this.generateAccessToken({
        userId: user.id
      });

      await this.prismaService.user.update({
        data: { accessToken: hashedAccessToken },
        where: { id: user.id }
      });

      return { ...user, accessToken };
    }

    return user;
  }

  public async deleteUser(where: Prisma.UserWhereUniqueInput): Promise<User> {
    try {
      await this.prismaService.access.deleteMany({
        where: { OR: [{ granteeUserId: where.id }, { userId: where.id }] }
      });
    } catch {}

    try {
      await this.prismaService.account.deleteMany({
        where: { userId: where.id }
      });
    } catch {}

    try {
      await this.prismaService.analytics.delete({
        where: { userId: where.id }
      });
    } catch {}

    try {
      await this.orderService.deleteOrders({
        userId: where.id
      });
    } catch {}

    try {
      await this.prismaService.settings.delete({
        where: { userId: where.id }
      });
    } catch {}

    return this.prismaService.user.delete({
      where
    });
  }

  public async resetAnalytics() {
    return this.prismaService.analytics.updateMany({
      data: {
        dataProviderGhostfolioDailyRequests: 0
      },
      where: {
        updatedAt: {
          gte: subDays(new Date(), 1)
        }
      }
    });
  }

  public async updateUser({
    data,
    where
  }: {
    data: Prisma.UserUpdateInput;
    where: Prisma.UserWhereUniqueInput;
  }): Promise<User> {
    return this.prismaService.user.update({
      data,
      where
    });
  }

  public async updateUserSetting({
    emitPortfolioChangedEvent,
    userId,
    userSettings
  }: {
    emitPortfolioChangedEvent: boolean;
    userId: string;
    userSettings: UserSettings;
  }) {
    const { settings } = await this.prismaService.settings.upsert({
      create: {
        settings: userSettings as unknown as Prisma.JsonObject,
        user: {
          connect: {
            id: userId
          }
        }
      },
      update: {
        settings: userSettings as unknown as Prisma.JsonObject
      },
      where: {
        userId
      }
    });

    if (emitPortfolioChangedEvent) {
      this.eventEmitter.emit(
        PortfolioChangedEvent.getName(),
        new PortfolioChangedEvent({
          userId
        })
      );
    }

    return settings;
  }
}
