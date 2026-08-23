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
import { addDays, subDays } from 'date-fns';

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

    const updateAccess = jest.fn().mockResolvedValue(undefined);

    const configurationService = {
      get: (key: string) => {
        return key === 'ENABLE_FEATURE_SUBSCRIPTION'
          ? isSubscriptionEnabled
          : undefined;
      }
    } as unknown as ConfigurationService;

    const prismaService = {
      access: {
        findFirst: async ({
          where
        }: {
          where?: {
            granteeUserId?: string;
            id?: string;
            type?: { in?: string[] };
          };
        }) => {
          if (!access) {
            return null;
          }

          if (
            where?.granteeUserId &&
            where.granteeUserId !== access.granteeUserId
          ) {
            return null;
          }

          if (where?.id && where.id !== access.id) {
            return null;
          }

          if (where?.type?.in && !where.type.in.includes(access.type)) {
            return null;
          }

          return access;
        },
        update: updateAccess
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
      updateAccess,
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
      scopes: [scopes.portfolioRead],
      type: 'PRIVATE',
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

  // A client of the model context protocol has no authenticated user, hence
  // the access itself is the credential
  describe('With an access as the credential', () => {
    const accessOfMcp = {
      granteeUserId: null,
      id: accessId,
      scopes: [scopes.portfolioRead],
      settings: {},
      type: 'MCP',
      userId: impersonatedUserId
    } as unknown as Access;

    const impersonatedUser = {
      createdAt: new Date('2024-01-01'),
      id: impersonatedUserId,
      settings: { settings: { baseCurrency: 'USD' } },
      subscriptions: []
    };

    it('Resolves the scopes of the access', async () => {
      const {
        isActive,
        scopes: scopesOfAccess,
        userId
      } = await createService({
        access: accessOfMcp,
        impersonatedUser
      }).service.resolve({ impersonationId: accessId, types: ['MCP'] });

      expect(isActive).toEqual(true);
      expect(scopesOfAccess).toEqual([scopes.portfolioRead]);
      expect(userId).toEqual(impersonatedUserId);
    });

    // The absence of the types is what stops an access from becoming a
    // credential, hence a caller which omits them gets nothing
    it('Refuses the identifier without the types', async () => {
      const { isActive, userId } = await createService({
        access: accessOfMcp,
        impersonatedUser
      }).service.resolve({ impersonationId: accessId });

      expect(isActive).toEqual(false);
      expect(userId).toBeUndefined();
    });

    it('Refuses the identifier with an empty list of types', async () => {
      const { isActive, userId } = await createService({
        access: accessOfMcp,
        impersonatedUser
      }).service.resolve({ impersonationId: accessId, types: [] });

      expect(isActive).toEqual(false);
      expect(userId).toBeUndefined();
    });

    it('Refuses an access of the type PRIVATE', async () => {
      const { isActive, userId } = await createService({
        access: { ...accessOfMcp, type: 'PRIVATE' } as unknown as Access,
        impersonatedUser
      }).service.resolve({ impersonationId: accessId, types: ['MCP'] });

      expect(isActive).toEqual(false);
      expect(userId).toBeUndefined();
    });

    it('Refuses an access of the type PUBLIC', async () => {
      const { isActive, userId } = await createService({
        access: { ...accessOfMcp, type: 'PUBLIC' } as unknown as Access,
        impersonatedUser
      }).service.resolve({ impersonationId: accessId, types: ['MCP'] });

      expect(isActive).toEqual(false);
      expect(userId).toBeUndefined();
    });

    // The identifier is the one of the access and not the one of the user who
    // granted it, hence an access can never be resolved by another identifier
    it('Refuses the identifier of another access', async () => {
      const { isActive, userId } = await createService({
        access: accessOfMcp,
        impersonatedUser
      }).service.resolve({
        impersonationId: 'b7c9a0d3-f2c1-4c8a-8f2d-1e6b5d3f2c19',
        types: ['MCP']
      });

      expect(isActive).toEqual(false);
      expect(userId).toBeUndefined();
    });

    it('Refuses the identifier of the user who granted the access', async () => {
      const { isActive, userId } = await createService({
        access: accessOfMcp,
        impersonatedUser
      }).service.resolve({
        impersonationId: impersonatedUserId,
        types: ['MCP']
      });

      expect(isActive).toEqual(false);
      expect(userId).toBeUndefined();
    });
  });

  // The guard rejects the request in this case, hence the context must not
  // present the data of the authenticated user as impersonated data
  describe('With an expiration date', () => {
    const expiringAccess = {
      granteeUserId: authenticatedUserId,
      id: accessId,
      scopes: [scopes.portfolioRead],
      type: 'PRIVATE',
      userId: impersonatedUserId
    } as unknown as Access;

    const impersonatedUser = {
      createdAt: new Date('2024-01-01'),
      id: impersonatedUserId,
      settings: { settings: { baseCurrency: 'USD' } },
      subscriptions: []
    };

    it('Resolves an access which expires in the future', async () => {
      const { service } = createService({
        impersonatedUser,
        access: {
          ...expiringAccess,
          expiresAt: addDays(new Date(), 1)
        } as unknown as Access
      });

      const { isActive } = await service.resolve({
        impersonationId: accessId,
        user: authenticatedUser
      });

      expect(isActive).toEqual(true);
    });

    it('Refuses an access which has expired', async () => {
      const { service } = createService({
        impersonatedUser,
        access: {
          ...expiringAccess,
          expiresAt: subDays(new Date(), 1)
        } as unknown as Access
      });

      const { isActive, scopes: scopesOfContext } = await service.resolve({
        impersonationId: accessId,
        user: authenticatedUser
      });

      expect(isActive).toEqual(false);
      expect(scopesOfContext).toEqual(getScopesOfOwnAccess());
    });

    // An expired access must not fall through to the permission to impersonate
    // all users, which would give an administrator the access again
    it('Refuses an access which has expired for an administrator', async () => {
      const { service } = createService({
        impersonatedUser,
        access: {
          ...expiringAccess,
          expiresAt: subDays(new Date(), 1)
        } as unknown as Access
      });

      const { isActive } = await service.resolve({
        impersonationId: accessId,
        user: {
          ...authenticatedUser,
          permissions: [permissions.impersonateAllUsers]
        } as unknown as typeof authenticatedUser
      });

      expect(isActive).toEqual(false);
    });
  });

  describe('With the date of the last usage', () => {
    const impersonatedUser = {
      createdAt: new Date('2024-01-01'),
      id: impersonatedUserId,
      settings: { settings: { baseCurrency: 'USD' } },
      subscriptions: []
    };

    const usedAccess = {
      granteeUserId: authenticatedUserId,
      id: accessId,
      scopes: [scopes.portfolioRead],
      type: 'PRIVATE',
      userId: impersonatedUserId
    } as unknown as Access;

    it('Records the first usage', async () => {
      const { service, updateAccess } = createService({
        impersonatedUser,
        access: usedAccess
      });

      await service.resolve({
        impersonationId: accessId,
        user: authenticatedUser
      });

      expect(updateAccess).toHaveBeenCalledTimes(1);
    });

    it('Records the usage of a previous day', async () => {
      const { service, updateAccess } = createService({
        impersonatedUser,
        access: {
          ...usedAccess,
          lastUsedAt: subDays(new Date(), 1)
        } as unknown as Access
      });

      await service.resolve({
        impersonationId: accessId,
        user: authenticatedUser
      });

      expect(updateAccess).toHaveBeenCalledTimes(1);
    });

    // A request which repeats must not write to the database every time
    it('Does not record a usage of the same day again', async () => {
      const { service, updateAccess } = createService({
        impersonatedUser,
        access: { ...usedAccess, lastUsedAt: new Date() } as unknown as Access
      });

      await service.resolve({
        impersonationId: accessId,
        user: authenticatedUser
      });

      expect(updateAccess).not.toHaveBeenCalled();
    });
  });

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
