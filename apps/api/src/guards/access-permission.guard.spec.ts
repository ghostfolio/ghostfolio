import { UserService } from '@ghostfolio/api/app/user/user.service';
import { permissions } from '@ghostfolio/common/permissions';
import type {
  ImpersonationContext,
  UserWithSettings
} from '@ghostfolio/common/types';

import { ExecutionContext, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AccessPermissionGuard } from './access-permission.guard';

// The reflector reads the metadata of the handler and of the class, which the
// tests set directly, hence the two only have to be identifiable
class HandlerClass {
  public handler() {
    return undefined;
  }
}

describe('AccessPermissionGuard', () => {
  let guard: AccessPermissionGuard;
  let reflector: Reflector;
  let request: { impersonation?: ImpersonationContext };
  let userService: UserService;

  function createExecutionContext() {
    return {
      getClass: () => {
        return HandlerClass;
      },
      getHandler: () => {
        return HandlerClass.prototype.handler;
      },
      getType: () => {
        return 'http';
      },
      switchToHttp: () => {
        return {
          getRequest: () => {
            return request;
          }
        };
      }
    } as unknown as ExecutionContext;
  }

  function setupRequiredPermission(requiredPermission?: string) {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(requiredPermission);
  }

  function setupUser(userPermissions: string[]) {
    jest.spyOn(userService, 'user').mockResolvedValue({
      id: 'user-id',
      permissions: userPermissions
    } as UserWithSettings);
  }

  beforeEach(() => {
    reflector = new Reflector();
    request = { impersonation: { userId: 'user-id' } as ImpersonationContext };
    userService = { user: jest.fn() } as unknown as UserService;

    guard = new AccessPermissionGuard(reflector, userService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('Admits a route which requires no permission', async () => {
    setupRequiredPermission(undefined);

    expect(await guard.canActivate(createExecutionContext())).toBe(true);

    expect(userService.user).not.toHaveBeenCalled();
  });

  it('Admits a user who has the permission', async () => {
    setupRequiredPermission(permissions.createActivity);
    setupUser([permissions.createActivity]);

    expect(await guard.canActivate(createExecutionContext())).toBe(true);
  });

  it('Refuses a user who does not have the permission', async () => {
    setupRequiredPermission(permissions.createActivity);
    setupUser([]);

    await expect(guard.canActivate(createExecutionContext())).rejects.toThrow(
      HttpException
    );
  });

  it('Refuses a request which has no impersonation context', async () => {
    setupRequiredPermission(permissions.createActivity);
    request = {};

    await expect(guard.canActivate(createExecutionContext())).rejects.toThrow(
      HttpException
    );

    expect(userService.user).not.toHaveBeenCalled();
  });

  // The handler reads the user from the context, hence it does no second query
  it('Puts the user into the impersonation context', async () => {
    setupRequiredPermission(permissions.createActivity);
    setupUser([permissions.createActivity]);

    await guard.canActivate(createExecutionContext());

    expect(request.impersonation.user).toEqual(
      expect.objectContaining({ id: 'user-id' })
    );
  });

  it('Reads the permission of the user of the access', async () => {
    setupRequiredPermission(permissions.createActivity);
    setupUser([permissions.createActivity]);

    await guard.canActivate(createExecutionContext());

    expect(userService.user).toHaveBeenCalledWith({ id: 'user-id' });
  });
});
