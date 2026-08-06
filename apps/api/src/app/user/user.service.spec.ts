import { SubscriptionType } from '@ghostfolio/common/enums';
import { permissions } from '@ghostfolio/common/permissions';

import { Role } from '@prisma/client';

import { UserService } from './user.service';

describe('UserService AI chat permissions', () => {
  const createService = ({
    isExperimentalFeatures,
    role,
    subscriptionType
  }: {
    isExperimentalFeatures: boolean;
    role: Role;
    subscriptionType?: SubscriptionType;
  }) => {
    const prismaService = {
      user: {
        findUnique: jest.fn(async () => ({
          _count: { activities: 0 },
          accessesGet: [],
          accessToken: null,
          accounts: [],
          analytics: {
            activityCount: 0,
            dataProviderGhostfolioDailyRequests: 0
          },
          authChallenge: null,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          id: 'user-1',
          provider: 'GOOGLE',
          role,
          settings: {
            settings: { isExperimentalFeatures },
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            userId: 'user-1'
          },
          subscriptions: [],
          thirdPartyId: null,
          updatedAt: new Date('2026-01-01T00:00:00.000Z')
        }))
      }
    };

    const service = new UserService(
      {} as never,
      {
        get: jest.fn((key: string) => {
          return key === 'ENABLE_FEATURE_SUBSCRIPTION' && !!subscriptionType;
        })
      } as never,
      {} as never,
      {} as never,
      prismaService as never,
      {
        getByKey: jest.fn(async () => undefined)
      } as never,
      {
        getSubscription: jest.fn(async () => {
          return subscriptionType ? { type: subscriptionType } : undefined;
        })
      } as never,
      {} as never
    );

    return service;
  };

  it.each([Role.ADMIN, Role.USER])(
    'removes accessAiChat for a non-experimental %s',
    async (role) => {
      const user = await createService({
        isExperimentalFeatures: false,
        role
      }).user({ id: 'user-1' });

      expect(user.permissions).not.toContain(permissions.accessAiChat);
    }
  );

  it('removes accessAiChat for a Basic subscriber', async () => {
    const user = await createService({
      isExperimentalFeatures: true,
      role: Role.USER,
      subscriptionType: SubscriptionType.Basic
    }).user({ id: 'user-1' });

    expect(user.permissions).not.toContain(permissions.accessAiChat);
  });

  it.each([Role.ADMIN, Role.USER])(
    'preserves accessAiChat for an eligible %s',
    async (role) => {
      const user = await createService({
        isExperimentalFeatures: true,
        role
      }).user({ id: 'user-1' });

      expect(user.permissions).toContain(permissions.accessAiChat);
    }
  );

  it('does not grant accessAiChat to a demo user', async () => {
    const user = await createService({
      isExperimentalFeatures: true,
      role: Role.DEMO
    }).user({ id: 'user-1' });

    expect(user.permissions).not.toContain(permissions.accessAiChat);
  });
});
