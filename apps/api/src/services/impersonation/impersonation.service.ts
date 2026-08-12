import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { DEFAULT_CURRENCY } from '@ghostfolio/common/config';
import { UserSettings } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import type {
  ImpersonationContext,
  UserWithSettings
} from '@ghostfolio/common/types';

import { Injectable } from '@nestjs/common';

@Injectable()
export class ImpersonationService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async resolve({
    impersonationId,
    user
  }: {
    impersonationId?: string;
    user?: UserWithSettings;
  }): Promise<ImpersonationContext> {
    const impersonatedUserId = await this.validateImpersonationId({
      impersonationId,
      user
    });

    if (!impersonatedUserId) {
      return {
        isActive: false,
        userId: user?.id,
        userSettings: user?.settings?.settings ?? {}
      };
    }

    const settings = await this.prismaService.settings.findUnique({
      where: { userId: impersonatedUserId }
    });

    return {
      accessId: impersonationId,
      isActive: true,
      userId: impersonatedUserId,
      userSettings: {
        ...((settings?.settings ?? {}) as UserSettings),
        baseCurrency:
          (settings?.settings as UserSettings)?.baseCurrency ?? DEFAULT_CURRENCY
      }
    };
  }

  public async validateImpersonationId({
    impersonationId,
    user
  }: {
    impersonationId?: string;
    user?: UserWithSettings;
  }) {
    if (!impersonationId) {
      return null;
    }

    if (user) {
      const accessObject = await this.prismaService.access.findFirst({
        where: {
          granteeUserId: user.id,
          id: impersonationId
        }
      });

      if (accessObject?.userId) {
        return accessObject.userId;
      } else if (
        hasPermission(user.permissions, permissions.impersonateAllUsers)
      ) {
        // The identifier is a user id in this case, hence verify its existence
        const impersonatedUser = await this.prismaService.user.findUnique({
          select: { id: true },
          where: { id: impersonationId }
        });

        return impersonatedUser?.id ?? null;
      }
    } else {
      // Public access
      const accessObject = await this.prismaService.access.findFirst({
        where: {
          granteeUserId: null,
          user: { id: impersonationId }
        }
      });

      if (accessObject?.userId) {
        return accessObject.userId;
      }
    }

    return null;
  }
}
