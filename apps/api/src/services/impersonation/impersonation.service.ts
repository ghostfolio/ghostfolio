import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { DEFAULT_CURRENCY } from '@ghostfolio/common/config';
import { UserSettings } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import {
  getScopesOfAccess,
  getScopesOfOwnAccess,
  getScopesOfUnrestrictedImpersonation
} from '@ghostfolio/common/scopes';
import type {
  ImpersonationContext,
  UserWithSettings
} from '@ghostfolio/common/types';

import { Injectable } from '@nestjs/common';
import { Access } from '@prisma/client';

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
    const { access, userId: impersonatedUserId } =
      await this.validateImpersonation({ impersonationId, user });

    if (!impersonatedUserId) {
      return {
        isActive: false,
        scopes: getScopesOfOwnAccess(),
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
      // An access which has not been granted explicitly originates from the
      // permission to impersonate all users
      scopes: access
        ? getScopesOfAccess(access)
        : getScopesOfUnrestrictedImpersonation(),
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
    const { userId } = await this.validateImpersonation({
      impersonationId,
      user
    });

    return userId;
  }

  private async validateImpersonation({
    impersonationId,
    user
  }: {
    impersonationId?: string;
    user?: UserWithSettings;
  }): Promise<{ access?: Access; userId: string | null }> {
    if (!impersonationId) {
      return { userId: null };
    }

    if (user) {
      const accessObject = await this.prismaService.access.findFirst({
        where: {
          granteeUserId: user.id,
          id: impersonationId
        }
      });

      if (accessObject?.userId) {
        return { access: accessObject, userId: accessObject.userId };
      } else if (
        hasPermission(user.permissions, permissions.impersonateAllUsers)
      ) {
        // The identifier is a user id in this case, hence verify its existence
        const impersonatedUser = await this.prismaService.user.findUnique({
          select: { id: true },
          where: { id: impersonationId }
        });

        return { userId: impersonatedUser?.id ?? null };
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
        return { access: accessObject, userId: accessObject.userId };
      }
    }

    return { userId: null };
  }
}
