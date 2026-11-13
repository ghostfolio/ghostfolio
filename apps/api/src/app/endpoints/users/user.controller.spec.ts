import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import { UserService } from '@ghostfolio/api/services/user/user.service';
import { UpdateUserSettingDto } from '@ghostfolio/common/dtos';
import { UserSettings } from '@ghostfolio/common/interfaces';
import { permissions } from '@ghostfolio/common/permissions';
import type {
  ImpersonationContext,
  RequestWithUser
} from '@ghostfolio/common/types';

import { HttpException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { StatusCodes } from 'http-status-codes';

import { UserController } from './user.controller';

describe('UserController benchmark comparison settings', () => {
  const updateUserSetting = jest.fn();

  function createController({
    settings = {},
    role = 'USER',
    grantedPermissions = [permissions.updateUserSettings]
  }: {
    settings?: UserSettings;
    role?: string;
    grantedPermissions?: string[];
  } = {}) {
    const request = {
      user: {
        id: 'benchmark-test-user',
        role,
        permissions: grantedPermissions,
        settings: { settings }
      }
    } as unknown as RequestWithUser;

    const userService = {
      updateUserSetting
    } as unknown as UserService;

    return new UserController(
      {} as ConfigurationService,
      {} as JwtService,
      {} as PropertyService,
      request,
      userService
    );
  }

  async function update(
    controller: UserController,
    data: UpdateUserSettingDto,
    isActive = false
  ) {
    return controller.updateUserSetting(data, {
      isActive
    } as ImpersonationContext);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    updateUserSetting.mockResolvedValue({});
  });

  it.each(['ACTIVITY_MATCHED_ROI', 'ACTIVITY_MATCHED_ROAI'] as const)(
    'preserves %s with experimental features enabled',
    async (mode) => {
      const controller = createController({
        settings: { isExperimentalFeatures: true }
      });

      await update(controller, { benchmarkComparisonMode: mode });

      expect(updateUserSetting).toHaveBeenCalledWith({
        emitPortfolioChangedEvent: false,
        userId: 'benchmark-test-user',
        userSettings: {
          isExperimentalFeatures: true,
          benchmarkComparisonMode: mode
        }
      });
    }
  );

  it('removes the mode when experimental features are disabled', async () => {
    const controller = createController({
      settings: {
        isExperimentalFeatures: true,
        benchmarkComparisonMode: 'ACTIVITY_MATCHED_ROI'
      }
    });

    await update(controller, { isExperimentalFeatures: false });

    expect(updateUserSetting).toHaveBeenCalledWith({
      emitPortfolioChangedEvent: false,
      userId: 'benchmark-test-user',
      userSettings: {}
    });
  });

  it('does not retain a mode when experimental features are disabled', async () => {
    const controller = createController();

    await update(controller, {
      benchmarkComparisonMode: 'ACTIVITY_MATCHED_ROAI'
    });

    expect(updateUserSetting).toHaveBeenCalledWith({
      emitPortfolioChangedEvent: false,
      userId: 'benchmark-test-user',
      userSettings: {}
    });
  });

  it('rejects updates without permission', async () => {
    const controller = createController({
      grantedPermissions: []
    });

    await expect(
      update(controller, {
        benchmarkComparisonMode: 'ACTIVITY_MATCHED_ROI'
      })
    ).rejects.toMatchObject({
      status: StatusCodes.FORBIDDEN
    });

    expect(updateUserSetting).not.toHaveBeenCalled();
  });

  it('does not grant the DEMO exception to benchmark comparison mode', async () => {
    const controller = createController({
      role: 'DEMO',
      grantedPermissions: []
    });

    await expect(
      update(controller, {
        benchmarkComparisonMode: 'ACTIVITY_MATCHED_ROAI'
      })
    ).rejects.toBeInstanceOf(HttpException);

    expect(updateUserSetting).not.toHaveBeenCalled();
  });

  it('allows the authenticated user to change the mode during impersonation', async () => {
    const controller = createController({
      settings: { isExperimentalFeatures: true }
    });

    await update(
      controller,
      { benchmarkComparisonMode: 'ACTIVITY_MATCHED_ROI' },
      true
    );

    expect(updateUserSetting).toHaveBeenCalledWith(
      expect.objectContaining({
        userSettings: expect.objectContaining({
          benchmarkComparisonMode: 'ACTIVITY_MATCHED_ROI'
        })
      })
    );
  });

  it('rejects portfolio settings during impersonation', async () => {
    const controller = createController();

    await expect(
      update(controller, { baseCurrency: 'USD' }, true)
    ).rejects.toBeInstanceOf(HttpException);

    expect(updateUserSetting).not.toHaveBeenCalled();
  });
});
