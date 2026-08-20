import { SubscriptionService } from '@ghostfolio/api/app/subscription/subscription.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { DEFAULT_CURRENCY } from '@ghostfolio/common/config';
import { SubscriptionType } from '@ghostfolio/common/enums';
import { permissions } from '@ghostfolio/common/permissions';
import {
  getScopesOfOwnAccess,
  getScopesOfUnrestrictedImpersonation,
  scopes
} from '@ghostfolio/common/scopes';
import type { UserWithSettings } from '@ghostfolio/common/types';

import { Access } from '@prisma/client';

import { ImpersonationService } from './impersonation.service';

describe('Impersonation service', () => {
  const accessId = 'a5d3f2c1-9b4e-4c8a-8f2d-1e6b7c9a0d3f';
  const authenticatedUserId = 'ffb08949-2f8a-4b6e-88fd-0f1e6b6b5f5d';
  const impersonatedUserId = 'e2d43f0d-1a41-4b6e-9d5b-6f9a2b7c8d1e';

  const authenticatedUser = {
    id: authenticatedUserId,
    permissions: [],
    settings: { settings: { baseCurrency: 'CHF' } },
    subscription: { type: SubscriptionType.Premium }
  } as unknown as UserWithSettings;

  function createService({
    access,
    impersonatedUser,
    isSubscriptionEnabled = false
  }: {
    access?: Partial<Access>;
    impersonatedUser?: unknown;
    isSubscriptionEnabled?: boolean;
  } = {}) {
    const getSubscription = jest.fn().mockResolvedValue({
      type: SubscriptionType.Basic
    });

    const configurationService = {
      get: (key: string) => {
        return key === 'ENABLE_FEATURE_SUBSCRIPTION'
          ? isSubscriptionEnabled
          : undefined;
      }
    } as unknown as ConfigurationService;

    const prismaService = {
      access: {
        findFirst: async () => {
          return access ?? null;
        }
      },
      user: {
        findUnique: async () => {
          return impersonatedUser ?? null;
        }
      }
    } as unknown as PrismaService;

    const subscriptionService = {
      getSubscription
    } as unknown as SubscriptionService;

    return {
      getSubscription,
      service: new ImpersonationService(
        configurationService,
        prismaService,
        subscriptionService
      )
    };
  }

  describe('Without an impersonation', () => {
    it('Resolves the own access of the authenticated user', async () => {
      const { service } = createService();

      expect(await service.resolve({ user: authenticatedUser })).toEqual({
        authenticatedUserSubscription: authenticatedUser.subscription,
        isActive: false,
        scopes: getScopesOfOwnAccess(),
        userId: authenticatedUserId,
        userSettings: { baseCurrency: 'CHF' },
        userSubscription: authenticatedUser.subscription
      });
    });

    it('Resolves a user without settings', async () => {
      const { service } = createService();

      const { userSettings } = await service.resolve({
        user: { id: authenticatedUserId } as UserWithSettings
      });

      expect(userSettings).toEqual({});
    });
  });

  describe('With an impersonation', () => {
    const grantedAccess = {
      granteeUserId: authenticatedUserId,
      id: accessId,
      permissions: ['READ'],
      scopes: [scopes.portfolioRead],
      userId: impersonatedUserId
    } as unknown as Access;

    const impersonatedUser = {
      createdAt: new Date('2024-01-01'),
      id: impersonatedUserId,
      settings: { settings: { baseCurrency: 'USD' } },
      subscriptions: []
    };

    it('Resolves the scopes of the granted access', async () => {
      const { service } = createService({
        access: grantedAccess,
        impersonatedUser
      });

      expect(
        await service.resolve({
          impersonationId: accessId,
          user: authenticatedUser
        })
      ).toEqual({
        accessId,
        authenticatedUserSubscription: authenticatedUser.subscription,
        isActive: true,
        scopes: [scopes.portfolioRead],
        userId: impersonatedUserId,
        userSettings: { baseCurrency: 'USD' },
        userSubscription: undefined
      });
    });

    // The subscription of the authenticated user is required to evaluate the
    // more restrictive of the two subscriptions
    it('Keeps the subscription of the authenticated user', async () => {
      const { service } = createService({
        access: grantedAccess,
        impersonatedUser
      });

      const { authenticatedUserSubscription } = await service.resolve({
        impersonationId: accessId,
        user: authenticatedUser
      });

      expect(authenticatedUserSubscription).toEqual(
        authenticatedUser.subscription
      );
    });

    it('Falls back to the default currency without settings', async () => {
      const { service } = createService({
        access: grantedAccess,
        impersonatedUser: { ...impersonatedUser, settings: null }
      });

      const { userSettings } = await service.resolve({
        impersonationId: accessId,
        user: authenticatedUser
      });

      expect(userSettings).toEqual({ baseCurrency: DEFAULT_CURRENCY });
    });

    it('Omits the subscription while the feature is disabled', async () => {
      const { getSubscription, service } = createService({
        access: grantedAccess,
        impersonatedUser
      });

      const { userSubscription } = await service.resolve({
        impersonationId: accessId,
        user: authenticatedUser
      });

      expect(userSubscription).toBeUndefined();
      expect(getSubscription).not.toHaveBeenCalled();
    });

    it('Resolves the subscription while the feature is enabled', async () => {
      const { getSubscription, service } = createService({
        access: grantedAccess,
        impersonatedUser,
        isSubscriptionEnabled: true
      });

      const { userSubscription } = await service.resolve({
        impersonationId: accessId,
        user: authenticatedUser
      });

      expect(userSubscription).toEqual({ type: SubscriptionType.Basic });
      expect(getSubscription).toHaveBeenCalledWith({
        createdAt: impersonatedUser.createdAt,
        subscriptions: []
      });
    });

    // An administrator impersonates by a user id instead of an access id
    it('Resolves the unrestricted scopes of an administrator', async () => {
      const { service } = createService({
        impersonatedUser: { id: impersonatedUserId }
      });

      const { isActive, scopes: scopesOfImpersonation } = await service.resolve(
        {
          impersonationId: impersonatedUserId,
          user: {
            ...authenticatedUser,
            permissions: [permissions.impersonateAllUsers]
          } as UserWithSettings
        }
      );

      expect(isActive).toEqual(true);
      expect(scopesOfImpersonation).toEqual(
        getScopesOfUnrestrictedImpersonation()
      );
    });
  });

  // The guard rejects the request in this case, hence the context must not
  // present the data of the authenticated user as impersonated data
  describe('With an identifier which cannot be resolved', () => {
    it('Resolves the own access instead', async () => {
      const { service } = createService();

      const { isActive, userId } = await service.resolve({
        impersonationId: 'a-revoked-access-id',
        user: authenticatedUser
      });

      expect(isActive).toEqual(false);
      expect(userId).toEqual(authenticatedUserId);
    });
  });
});
