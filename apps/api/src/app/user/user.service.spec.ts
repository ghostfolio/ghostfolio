import { SubscriptionService } from '@ghostfolio/api/app/subscription/subscription.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import { PROPERTY_IS_READ_ONLY_MODE } from '@ghostfolio/common/config';
import { SubscriptionType } from '@ghostfolio/common/enums';
import { permissions } from '@ghostfolio/common/permissions';

import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';

import { UserService } from './user.service';

jest.mock('@ghostfolio/api/app/activities/activities.service', () => {
  return { ActivitiesService: class ActivitiesService {} };
});
jest.mock('@ghostfolio/api/services/i18n/i18n.service', () => {
  return { I18nService: class I18nService {} };
});

describe('UserService', () => {
  let configuration: Record<string, boolean>;
  let getSubscription: jest.Mock;
  let isReadOnlyMode: boolean;
  let userService: UserService;
  let userFromDatabase: {
    accounts: [];
    createdAt: Date;
    id: string;
    provider: 'ANONYMOUS';
    role: Role;
    settings: {
      settings: {
        isExperimentalFeatures: boolean;
        isGhostfolioAiEnabled: boolean;
      };
    };
    subscriptions: [];
  };

  beforeEach(async () => {
    configuration = {
      ENABLE_FEATURE_READ_ONLY_MODE: false,
      ENABLE_FEATURE_SUBSCRIPTION: false
    };
    isReadOnlyMode = false;
    getSubscription = jest.fn().mockResolvedValue({
      type: SubscriptionType.Premium,
      offer: {}
    });
    userFromDatabase = {
      accounts: [],
      createdAt: new Date('2024-01-01T00:00:00Z'),
      id: 'user-id',
      provider: 'ANONYMOUS',
      role: Role.USER,
      settings: {
        settings: {
          isExperimentalFeatures: true,
          isGhostfolioAiEnabled: true
        }
      },
      subscriptions: []
    };

    const module = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: ConfigurationService,
          useValue: {
            get: (key: string) => {
              return configuration[key];
            }
          }
        },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn().mockImplementation(() => {
                return Promise.resolve(userFromDatabase);
              })
            }
          }
        },
        {
          provide: PropertyService,
          useValue: {
            getByKey: jest.fn().mockImplementation((key: string) => {
              return Promise.resolve(
                key === PROPERTY_IS_READ_ONLY_MODE ? isReadOnlyMode : undefined
              );
            })
          }
        },
        {
          provide: SubscriptionService,
          useValue: { getSubscription }
        }
      ]
    })
      .useMocker(() => {
        return {};
      })
      .compile();

    userService = module.get(UserService);
  });

  describe('Ghostfolio AI permissions', () => {
    it.each([Role.USER, Role.ADMIN])(
      'allows self-hosted %s users with experimental features to enable AI',
      async (role) => {
        userFromDatabase.role = role;

        const user = await userService.user({ id: userFromDatabase.id });

        expect(user.permissions).toContain(permissions.enableGhostfolioAi);
        expect(user.settings.settings.isGhostfolioAiEnabled).toBe(true);
      }
    );

    it.each([
      { isExperimentalFeatures: false, role: Role.USER },
      { isExperimentalFeatures: true, role: Role.DEMO },
      { isExperimentalFeatures: true, role: Role.INACTIVE }
    ])(
      'withholds self-hosted AI access for $role with experimental features $isExperimentalFeatures',
      async ({ isExperimentalFeatures, role }) => {
        userFromDatabase.role = role;
        userFromDatabase.settings.settings.isExperimentalFeatures =
          isExperimentalFeatures;

        const user = await userService.user({ id: userFromDatabase.id });

        expect(user.permissions).not.toContain(permissions.enableGhostfolioAi);
      }
    );

    it('withholds hosted Basic AI access and clears the AI setting', async () => {
      configuration.ENABLE_FEATURE_SUBSCRIPTION = true;
      getSubscription.mockResolvedValue({ type: SubscriptionType.Basic });

      const user = await userService.user({ id: userFromDatabase.id });

      expect(user.permissions).not.toContain(permissions.enableGhostfolioAi);
      expect(user.settings.settings.isGhostfolioAiEnabled).toBeUndefined();
    });

    it.each([
      { expected: true, isExperimentalFeatures: true, role: Role.USER },
      { expected: false, isExperimentalFeatures: false, role: Role.USER },
      { expected: false, isExperimentalFeatures: true, role: Role.DEMO }
    ])(
      'preserves hosted Premium AI access $expected for $role with experimental features $isExperimentalFeatures',
      async ({ expected, isExperimentalFeatures, role }) => {
        configuration.ENABLE_FEATURE_SUBSCRIPTION = true;
        userFromDatabase.role = role;
        userFromDatabase.settings.settings.isExperimentalFeatures =
          isExperimentalFeatures;

        const user = await userService.user({ id: userFromDatabase.id });

        expect(user.permissions.includes(permissions.enableGhostfolioAi)).toBe(
          expected
        );
      }
    );

    it.each([false, true])(
      'respects self-hosted read-only mode set to %s',
      async (readOnlyMode) => {
        configuration.ENABLE_FEATURE_READ_ONLY_MODE = true;
        isReadOnlyMode = readOnlyMode;

        const user = await userService.user({ id: userFromDatabase.id });

        expect(user.permissions.includes(permissions.enableGhostfolioAi)).toBe(
          !readOnlyMode
        );
      }
    );
  });
});
