import { SubscriptionService } from '@ghostfolio/api/app/subscription/subscription.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { DEFAULT_CURRENCY } from '@ghostfolio/common/config';
import { AccessSettings, UserSettings } from '@ghostfolio/common/interfaces';
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
import { Access, AccessType } from '@prisma/client';

@Injectable()
export class ImpersonationService {
  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly prismaService: PrismaService,
    private readonly subscriptionService: SubscriptionService
  ) {}

  /**
   * Gives the context of the identifier. The types are the kinds of access
   * which the caller accepts as a credential of its own, hence a caller which
   * has no authenticated user has to name them. An empty list rejects every
   * identifier, so that an access can never be a credential by accident.
   */
  public async resolve({
    impersonationId,
    types,
    user
  }: {
    impersonationId?: string;
    types?: AccessType[];
    user?: UserWithSettings;
  }): Promise<ImpersonationContext> {
    const { access, userId: impersonatedUserId } =
      await this.validateImpersonation({ impersonationId, types, user });

    if (!impersonatedUserId) {
      return {
        authenticatedUserSubscription: user?.subscription,
        isActive: false,
        scopes: getScopesOfOwnAccess(),
        userId: user?.id,
        userSettings: user?.settings?.settings ?? {},
        userSubscription: user?.subscription
      };
    }

    const isSubscriptionEnabled = this.configurationService.get(
      'ENABLE_FEATURE_SUBSCRIPTION'
    );

    const impersonatedUser = await this.prismaService.user.findUnique({
      include: { settings: true, subscriptions: isSubscriptionEnabled },
      where: { id: impersonatedUserId }
    });

    const { filters } = (access?.settings ?? {}) as AccessSettings;
    const settings = impersonatedUser?.settings?.settings as UserSettings;

    return {
      filters,
      accessId: impersonationId,
      authenticatedUserSubscription: user?.subscription,
      isActive: true,
      // An access which has not been granted explicitly originates from the
      // permission to impersonate all users
      scopes: access
        ? getScopesOfAccess(access)
        : getScopesOfUnrestrictedImpersonation(),
      userId: impersonatedUserId,
      userSettings: {
        ...(settings ?? {}),
        baseCurrency: settings?.baseCurrency ?? DEFAULT_CURRENCY
      },
      userSubscription:
        isSubscriptionEnabled && impersonatedUser
          ? await this.subscriptionService.getSubscription({
              createdAt: impersonatedUser.createdAt,
              subscriptions: impersonatedUser.subscriptions ?? []
            })
          : undefined
    };
  }

  private async validateImpersonation({
    impersonationId,
    types,
    user
  }: {
    impersonationId?: string;
    types?: AccessType[];
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
    } else if (types?.length) {
      const accessObject = await this.prismaService.access.findFirst({
        where: {
          id: impersonationId,
          type: { in: types }
        }
      });

      if (accessObject?.userId) {
        return { access: accessObject, userId: accessObject.userId };
      }
    }

    return { userId: null };
  }
}
