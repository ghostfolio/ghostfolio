import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { locale } from '@ghostfolio/helper/config';
import { resetHours } from '@ghostfolio/helper/helper';
import { User as IUser, UserWithSettings } from '@ghostfolio/helper/interfaces';
import { getPermissions, permissions } from '@ghostfolio/helper/permissions';
import { Injectable } from '@nestjs/common';
import { Currency, Prisma, Provider, User } from '@prisma/client';
import { add } from 'date-fns';

const crypto = require('crypto');

@Injectable()
export class UserService {
  public static DEFAULT_CURRENCY = Currency.USD;

  public constructor(
    private readonly configurationService: ConfigurationService,
    private prisma: PrismaService
  ) {}

  public async getUser({
    Account,
    alias,
    id,
    role,
    Settings
  }: UserWithSettings): Promise<IUser> {
    const access = await this.prisma.access.findMany({
      include: {
        User: true
      },
      orderBy: { User: { alias: 'asc' } },
      where: { GranteeUser: { id } }
    });

    const currentPermissions = getPermissions(role);

    if (this.configurationService.get('ENABLE_FEATURE_FEAR_AND_GREED_INDEX')) {
      currentPermissions.push(permissions.accessFearAndGreedIndex);
    }

    return {
      alias,
      id,
      access: access.map((accessItem) => {
        return {
          alias: accessItem.User.alias,
          id: accessItem.id
        };
      }),
      accounts: Account,
      permissions: currentPermissions,
      settings: {
        baseCurrency: Settings?.currency || UserService.DEFAULT_CURRENCY,
        locale
      },
      subscription: {
        expiresAt: resetHours(add(new Date(), { days: 7 })),
        type: 'Trial'
      }
    };
  }

  public async user(
    userWhereUniqueInput: Prisma.UserWhereUniqueInput
  ): Promise<UserWithSettings | null> {
    const user = await this.prisma.user.findUnique({
      include: { Account: true, Settings: true },
      where: userWhereUniqueInput
    });

    if (user?.Settings) {
      if (!user.Settings.currency) {
        // Set default currency if needed
        user.Settings.currency = UserService.DEFAULT_CURRENCY;
      }
    } else if (user) {
      // Set default settings if needed
      user.Settings = {
        currency: UserService.DEFAULT_CURRENCY,
        updatedAt: new Date(),
        userId: user?.id
      };
    }

    return user;
  }

  public async users(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.UserWhereUniqueInput;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByInput;
  }): Promise<User[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.user.findMany({
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

  public async createUser(data?: Prisma.UserCreateInput): Promise<User> {
    let user = await this.prisma.user.create({
      data: {
        ...data,
        Account: {
          create: {
            isDefault: true,
            name: 'Default Account'
          }
        }
      }
    });

    if (data.provider === Provider.ANONYMOUS) {
      const accessToken = this.createAccessToken(
        user.id,
        this.getRandomString(10)
      );

      const hashedAccessToken = this.createAccessToken(
        accessToken,
        process.env.ACCESS_TOKEN_SALT
      );

      user = await this.prisma.user.update({
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
    return this.prisma.user.update({
      data,
      where
    });
  }

  public async deleteUser(where: Prisma.UserWhereUniqueInput): Promise<User> {
    await this.prisma.access.deleteMany({
      where: { OR: [{ granteeUserId: where.id }, { userId: where.id }] }
    });

    await this.prisma.account.deleteMany({
      where: { userId: where.id }
    });

    await this.prisma.analytics.delete({
      where: { userId: where.id }
    });

    await this.prisma.order.deleteMany({
      where: { userId: where.id }
    });

    try {
      await this.prisma.settings.delete({
        where: { userId: where.id }
      });
    } catch {}

    return this.prisma.user.delete({
      where
    });
  }

  public async updateUserSettings({
    currency,
    userId
  }: {
    currency: Currency;
    userId: string;
  }) {
    await this.prisma.settings.upsert({
      create: {
        currency,
        User: {
          connect: {
            id: userId
          }
        }
      },
      update: {
        currency
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
