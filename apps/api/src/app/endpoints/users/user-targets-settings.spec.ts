import { UserSettings } from '@ghostfolio/common/interfaces';
import { permissions } from '@ghostfolio/common/permissions';
import { createDefaultPortfolioTarget } from '@ghostfolio/common/portfolio-targets/portfolio-targets-presets';
import {
  ImpersonationContext,
  RequestWithUser
} from '@ghostfolio/common/types';

import { UserController } from './user.controller';

jest.mock(
  '@ghostfolio/api/services/configuration/configuration.service',
  () => ({ ConfigurationService: class {} })
);
jest.mock('@ghostfolio/api/services/property/property.service', () => ({
  PropertyService: class {}
}));
jest.mock('@ghostfolio/api/services/user/user.service', () => ({
  UserService: class {}
}));

const context = { isActive: false } as ImpersonationContext;

describe('User controller target settings replacement and authorization', () => {
  function setup(allowed = true) {
    const oldProfile = {
      ...createDefaultPortfolioTarget(),
      presetId: 'old-preset'
    };
    const previous = {
      locale: 'it-IT',
      isExperimentalFeatures: true,
      portfolioTargets: {
        version: 1 as const,
        activeProfileId: 'global',
        profiles: [oldProfile, { ...oldProfile, id: 'stale' }]
      }
    };
    const request = {
      user: {
        id: 'owner',
        role: 'USER',
        permissions: allowed ? [permissions.updateUserSettings] : [],
        settings: { settings: previous }
      }
    } as unknown as RequestWithUser;
    const updateUserSetting = jest.fn(({ userSettings }) =>
      Promise.resolve(userSettings)
    );
    const controller = new UserController(
      undefined,
      undefined,
      undefined,
      request,
      { updateUserSetting } as never
    );
    return { controller, previous, updateUserSetting };
  }

  it('replaces profiles and removed preset metadata while preserving unrelated settings', async () => {
    const { controller, previous, updateUserSetting } = setup();
    const profile = createDefaultPortfolioTarget();
    delete profile.presetId;
    profile.name = 'Custom';
    const portfolioTargets = {
      version: 1 as const,
      activeProfileId: 'global',
      profiles: [profile]
    };
    const saved = (await controller.updateUserSetting(
      { portfolioTargets },
      context
    )) as UserSettings;
    expect(saved).toEqual({
      locale: 'it-IT',
      isExperimentalFeatures: true,
      portfolioTargets
    });
    expect(saved.portfolioTargets.profiles).toHaveLength(1);
    expect(saved.portfolioTargets.profiles[0]).not.toHaveProperty('presetId');
    expect(previous.portfolioTargets.profiles).toHaveLength(2);
    expect(updateUserSetting).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'owner',
        emitPortfolioChangedEvent: false
      })
    );
  });

  it('preserves targets on unrelated updates', async () => {
    const { controller, previous } = setup();
    const saved = (await controller.updateUserSetting(
      { locale: 'en-US' },
      context
    )) as UserSettings;
    expect(saved.portfolioTargets).toEqual(previous.portfolioTargets);
    expect(saved.locale).toBe('en-US');
  });

  it('rejects users without settings permission', async () => {
    const { controller, updateUserSetting } = setup(false);
    await expect(
      controller.updateUserSetting(
        {
          portfolioTargets: {
            version: 1,
            activeProfileId: 'global',
            profiles: [createDefaultPortfolioTarget()]
          }
        },
        context
      )
    ).rejects.toMatchObject({ status: 403 });
    expect(updateUserSetting).not.toHaveBeenCalled();
  });

  it('rejects target writes during impersonation', async () => {
    const { controller, updateUserSetting } = setup();
    await expect(
      controller.updateUserSetting(
        {
          portfolioTargets: {
            version: 1,
            activeProfileId: 'global',
            profiles: [createDefaultPortfolioTarget()]
          }
        },
        { isActive: true } as ImpersonationContext
      )
    ).rejects.toMatchObject({ status: 403 });
    expect(updateUserSetting).not.toHaveBeenCalled();
  });
});
