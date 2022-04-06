import { SubscriptionService } from '@ghostfolio/api/app/subscription/subscription.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import {
  PROPERTY_IS_READ_ONLY_MODE,
  baseCurrency,
  locale
} from '@ghostfolio/common/config';
import { User as IUser, UserWithSettings } from '@ghostfolio/common/interfaces';
import {
  getPermissions,
  hasRole,
  permissions
} from '@ghostfolio/common/permissions';
import { SubscriptionType } from '@ghostfolio/common/types/subscription.type';
import { Injectable } from '@nestjs/common';
import { Prisma, Role, User, ViewMode } from '@prisma/client';

import { UserSettingsParams } from './interfaces/user-settings-params.interface';
import { UserSettings } from './interfaces/user-settings.interface';

const crypto = require('crypto');

@Injectable()
export class UserService {
  public static DEFAULT_CURRENCY = 'USD';

  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly prismaService: PrismaService,
    private readonly propertyService: PropertyService,
    private readonly subscriptionService: SubscriptionService
  ) {}

  public async getUser(
    {
      Account,
      alias,
      id,
      permissions,
      Settings,
      subscription
    }: UserWithSettings,
    aLocale = locale
  ): Promise<IUser> {
    const access = await this.prismaService.access.findMany({
      include: {
        User: true
      },
      orderBy: { User: { alias: 'asc' } },
      where: { GranteeUser: { id } }
    });

    return {
      alias,
      id,
      permissions,
      subscription,
      access: access.map((accessItem) => {
        return {
          alias: accessItem.User.alias,
          id: accessItem.id
        };
      }),
      accounts: Account,
      settings: {
        ...(<UserSettings>Settings.settings),
        baseCurrency: Settings?.currency ?? UserService.DEFAULT_CURRENCY,
        locale: (<UserSettings>Settings.settings)?.locale ?? aLocale,
        viewMode: Settings?.viewMode ?? ViewMode.DEFAULT
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

  public isRestrictedView(aUser: UserWithSettings) {
    return (aUser.Settings.settings as UserSettings)?.isRestrictedView ?? false;
  }

  public async user(
    userWhereUniqueInput: Prisma.UserWhereUniqueInput
  ): Promise<UserWithSettings | null> {
    const userFromDatabase = await this.prismaService.user.findUnique({
      include: { Account: true, Settings: true, Subscription: true },
      where: userWhereUniqueInput
    });

    const user: UserWithSettings = userFromDatabase;

    let currentPermissions = getPermissions(userFromDatabase.role);

    if (this.configurationService.get('ENABLE_FEATURE_FEAR_AND_GREED_INDEX')) {
      currentPermissions.push(permissions.accessFearAndGreedIndex);
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

    user.permissions = currentPermissions;

    if (userFromDatabase?.Settings) {
      if (!userFromDatabase.Settings.currency) {
        // Set default currency if needed
        userFromDatabase.Settings.currency = UserService.DEFAULT_CURRENCY;
      }
    } else if (userFromDatabase) {
      // Set default settings if needed
      userFromDatabase.Settings = {
        currency: UserService.DEFAULT_CURRENCY,
        settings: null,
        updatedAt: new Date(),
        userId: userFromDatabase?.id,
        viewMode: ViewMode.DEFAULT
      };
    }

    if (this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION')) {
      user.subscription = this.subscriptionService.getSubscription(
        userFromDatabase?.Subscription
      );

      if (user.subscription.type === SubscriptionType.Basic) {
        user.permissions = user.permissions.filter((permission) => {
          return permission !== permissions.updateViewMode;
        });
        user.Settings.viewMode = ViewMode.ZEN;
      }
    }

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

  public async createUser(data: Prisma.UserCreateInput): Promise<User> {
    if (!data?.provider) {
      data.provider = 'ANONYMOUS';
    }

    let user = await this.prismaService.user.create({
      data: {
        ...data,
        Account: {
          create: {
            currency: baseCurrency,
            isDefault: true,
            name: 'Default Account'
          }
        },
        Settings: {
          create: {
            currency: baseCurrency
          }
        }
      }
    });

    if (data.provider === 'ANONYMOUS') {
      const accessToken = this.createAccessToken(
        user.id,
        this.getRandomString(10)
      );

      const hashedAccessToken = this.createAccessToken(
        accessToken,
        process.env.ACCESS_TOKEN_SALT
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
    await this.prismaService.access.deleteMany({
      where: { OR: [{ granteeUserId: where.id }, { userId: where.id }] }
    });

    await this.prismaService.account.deleteMany({
      where: { userId: where.id }
    });

    await this.prismaService.analytics.delete({
      where: { userId: where.id }
    });

    await this.prismaService.order.deleteMany({
      where: { userId: where.id }
    });

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
    userId,
    userSettings
  }: {
    userId: string;
    userSettings: UserSettings;
  }) {
    const settings = userSettings as Prisma.JsonObject;

    await this.prismaService.settings.upsert({
      create: {
        settings,
        User: {
          connect: {
            id: userId
          }
        }
      },
      update: {
        settings
      },
      where: {
        userId: userId
      }
    });

    return;
  }

  public async updateUserSettings({
    currency,
    userId,
    viewMode
  }: UserSettingsParams) {
    await this.prismaService.settings.upsert({
      create: {
        currency,
        User: {
          connect: {
            id: userId
          }
        },
        viewMode
      },
      update: {
        currency,
        viewMode
      },
      where: {
        userId: userId
      }
    });

    return;
  }

  private getRandomString(length: number) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const result = [];

    for (let i = 0; i < length; i++) {
      result.push(
        characters.charAt(Math.floor(Math.random() * characters.length))
      );
    }
    return result.join('');
  }
}
