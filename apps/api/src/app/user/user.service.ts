import { OrderService } from '@ghostfolio/api/app/order/order.service';
import { SubscriptionService } from '@ghostfolio/api/app/subscription/subscription.service';
import { environment } from '@ghostfolio/api/environments/environment';
import { PortfolioChangedEvent } from '@ghostfolio/api/events/portfolio-changed.event';
import { AccountClusterRiskCurrentInvestment } from '@ghostfolio/api/models/rules/account-cluster-risk/current-investment';
import { AccountClusterRiskSingleAccount } from '@ghostfolio/api/models/rules/account-cluster-risk/single-account';
import { AllocationClusterRiskDevelopedMarkets } from '@ghostfolio/api/models/rules/allocation-cluster-risk/developed-markets';
import { AllocationClusterRiskEmergingMarkets } from '@ghostfolio/api/models/rules/allocation-cluster-risk/emerging-markets';
import { CurrencyClusterRiskBaseCurrencyCurrentInvestment } from '@ghostfolio/api/models/rules/currency-cluster-risk/base-currency-current-investment';
import { CurrencyClusterRiskCurrentInvestment } from '@ghostfolio/api/models/rules/currency-cluster-risk/current-investment';
import { EmergencyFundSetup } from '@ghostfolio/api/models/rules/emergency-fund/emergency-fund-setup';
import { FeeRatioInitialInvestment } from '@ghostfolio/api/models/rules/fees/fee-ratio-initial-investment';
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

import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma, Role, User } from '@prisma/client';
import { differenceInDays } from 'date-fns';
import { sortBy, without } from 'lodash';

const crypto = require('crypto');

@Injectable()
export class UserService {
  private i18nService = new I18nService();

  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly eventEmitter: EventEmitter2,
    private readonly orderService: OrderService,
    private readonly prismaService: PrismaService,
    private readonly propertyService: PropertyService,
    private readonly subscriptionService: SubscriptionService,
    private readonly tagService: TagService
  ) {}

  public async count(args?: Prisma.UserCountArgs) {
    return this.prismaService.user.count(args);
  }

  public async getUser(
    { Account, id, permissions, Settings, subscription }: UserWithSettings,
    aLocale = locale
  ): Promise<IUser> {
    const userData = await Promise.all([
      this.prismaService.access.findMany({
        include: {
          User: true
        },
        orderBy: { alias: 'asc' },
        where: { GranteeUser: { id } }
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
    const firstActivity = userData[1];
    let tags = userData[2];

    let systemMessage: SystemMessage;

    const systemMessageProperty = (await this.propertyService.getByKey(
      PROPERTY_SYSTEM_MESSAGE
    )) as SystemMessage;

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
      id,
      permissions,
      subscription,
      systemMessage,
      tags,
      access: access.map((accessItem) => {
        return {
          alias: accessItem.alias,
          id: accessItem.id
        };
      }),
      accounts: Account,
      dateOfFirstActivity: firstActivity?.date ?? new Date(),
      settings: {
        ...(Settings.settings as UserSettings),
        locale: (Settings.settings as UserSettings)?.locale ?? aLocale
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
      Access,
      accessToken,
      Account,
      Analytics,
      authChallenge,
      createdAt,
      id,
      provider,
      role,
      Settings,
      Subscription,
      thirdPartyId,
      updatedAt
    } = await this.prismaService.user.findUnique({
      include: {
        Access: true,
        Account: {
          include: { Platform: true }
        },
        Analytics: true,
        Settings: true,
        Subscription: true
      },
      where: userWhereUniqueInput
    });

    const user: UserWithSettings = {
      Access,
      accessToken,
      Account,
      authChallenge,
      createdAt,
      id,
      provider,
      role,
      Settings: Settings as UserWithSettings['Settings'],
      thirdPartyId,
      updatedAt,
      activityCount: Analytics?.activityCount
    };

    if (user?.Settings) {
      if (!user.Settings.settings) {
        user.Settings.settings = {};
      }
    } else if (user) {
      // Set default settings if needed
      user.Settings = {
        settings: {},
        updatedAt: new Date(),
        userId: user?.id
      };
    }

    // Set default value for base currency
    if (!(user.Settings.settings as UserSettings)?.baseCurrency) {
      (user.Settings.settings as UserSettings).baseCurrency = DEFAULT_CURRENCY;
    }

    // Set default value for date range
    (user.Settings.settings as UserSettings).dateRange =
      (user.Settings.settings as UserSettings).viewMode === 'ZEN'
        ? 'max'
        : ((user.Settings.settings as UserSettings)?.dateRange ?? 'max');

    // Set default value for view mode
    if (!(user.Settings.settings as UserSettings).viewMode) {
      (user.Settings.settings as UserSettings).viewMode = 'DEFAULT';
    }

    (user.Settings.settings as UserSettings).xRayRules = {
      AccountClusterRiskCurrentInvestment:
        new AccountClusterRiskCurrentInvestment(undefined, {}).getSettings(
          user.Settings.settings
        ),
      AccountClusterRiskSingleAccount: new AccountClusterRiskSingleAccount(
        undefined,
        {}
      ).getSettings(user.Settings.settings),
      AllocationClusterRiskDevelopedMarkets:
        new AllocationClusterRiskDevelopedMarkets(
          undefined,
          undefined,
          undefined
        ).getSettings(user.Settings.settings),
      AllocationClusterRiskEmergingMarkets:
        new AllocationClusterRiskEmergingMarkets(
          undefined,
          undefined,
          undefined
        ).getSettings(user.Settings.settings),
      CurrencyClusterRiskBaseCurrencyCurrentInvestment:
        new CurrencyClusterRiskBaseCurrencyCurrentInvestment(
          undefined,
          undefined
        ).getSettings(user.Settings.settings),
      CurrencyClusterRiskCurrentInvestment:
        new CurrencyClusterRiskCurrentInvestment(
          undefined,
          undefined
        ).getSettings(user.Settings.settings),
      EmergencyFundSetup: new EmergencyFundSetup(
        undefined,
        undefined
      ).getSettings(user.Settings.settings),
      FeeRatioInitialInvestment: new FeeRatioInitialInvestment(
        undefined,
        undefined,
        undefined
      ).getSettings(user.Settings.settings)
    };

    let currentPermissions = getPermissions(user.role);

    if (!(user.Settings.settings as UserSettings).isExperimentalFeatures) {
      // currentPermissions = without(
      //   currentPermissions,
      //   permissions.xyz
      // );
    }

    if (this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION')) {
      user.subscription = this.subscriptionService.getSubscription({
        createdAt: user.createdAt,
        subscriptions: Subscription
      });

      if (user.subscription?.type === 'Basic') {
        const daysSinceRegistration = differenceInDays(
          new Date(),
          user.createdAt
        );
        let frequency = 10;

        if (daysSinceRegistration > 365) {
          frequency = 2;
        } else if (daysSinceRegistration > 180) {
          frequency = 3;
        } else if (daysSinceRegistration > 60) {
          frequency = 4;
        } else if (daysSinceRegistration > 30) {
          frequency = 6;
        } else if (daysSinceRegistration > 15) {
          frequency = 8;
        }

        if (Analytics?.activityCount % frequency === 1) {
          currentPermissions.push(permissions.enableSubscriptionInterstitial);
        }

        currentPermissions = without(
          currentPermissions,
          permissions.accessHoldingsChart,
          permissions.createAccess
        );

        // Reset benchmark
        user.Settings.settings.benchmark = undefined;

        // Reset holdings view mode
        user.Settings.settings.holdingsViewMode = undefined;
      } else if (user.subscription?.type === 'Premium') {
        currentPermissions.push(permissions.reportDataGlitch);

        currentPermissions = without(
          currentPermissions,
          permissions.deleteOwnUser
        );
      }
    }

    if (this.configurationService.get('ENABLE_FEATURE_READ_ONLY_MODE')) {
      if (hasRole(user, Role.ADMIN)) {
        currentPermissions.push(permissions.toggleReadOnlyMode);
      }

      const isReadOnlyMode = (await this.propertyService.getByKey(
        PROPERTY_IS_READ_ONLY_MODE
      )) as boolean;

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

    if (!environment.production && role === 'ADMIN') {
      currentPermissions.push(permissions.impersonateAllUsers);
    }

    user.Account = sortBy(user.Account, ({ name }) => {
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

  public createAccessToken(password: string, salt: string): string {
    const hash = crypto.createHmac('sha512', salt);
    hash.update(password);

    return hash.digest('hex');
  }

  public async createUser({
    data
  }: {
    data: Prisma.UserCreateInput;
  }): Promise<User> {
    if (!data?.provider) {
      data.provider = 'ANONYMOUS';
    }

    let user = await this.prismaService.user.create({
      data: {
        ...data,
        Account: {
          create: {
            currency: DEFAULT_CURRENCY,
            name: this.i18nService.getTranslation({
              id: 'myAccount',
              languageCode: DEFAULT_LANGUAGE_CODE // TODO
            })
          }
        },
        Settings: {
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
          User: { connect: { id: user.id } }
        }
      });
    }

    if (data.provider === 'ANONYMOUS') {
      const accessToken = this.createAccessToken(
        user.id,
        this.getRandomString(10)
      );

      const hashedAccessToken = this.createAccessToken(
        accessToken,
        this.configurationService.get('ACCESS_TOKEN_SALT')
      );

      user = await this.prismaService.user.update({
        data: { accessToken: hashedAccessToken },
        where: { id: user.id }
      });

      return { ...user, accessToken };
    }

    return user;
  }

  public async updateUser(params: {
    where: Prisma.UserWhereUniqueInput;
    data: Prisma.UserUpdateInput;
  }): Promise<User> {
    const { where, data } = params;
    return this.prismaService.user.update({
      data,
      where
    });
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
        User: {
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

  private getRandomString(length: number) {
    const bytes = crypto.randomBytes(length);
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const result = [];

    for (let i = 0; i < length; i++) {
      const randomByte = bytes[i];
      result.push(characters[randomByte % characters.length]);
    }

    return result.join('');
  }
}
