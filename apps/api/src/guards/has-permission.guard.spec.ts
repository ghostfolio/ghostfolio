import { HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';

import { HasPermissionGuard } from './has-permission.guard';

describe('HasPermissionGuard', () => {
  let guard: HasPermissionGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    reflector = new Reflector();
    guard = new HasPermissionGuard(reflector);
  });

  function setupReflectorSpy(returnValue: string) {
    jest.spyOn(reflector, 'get').mockReturnValue(returnValue);
  }

  function createMockExecutionContext(permissions: string[]) {
    return new ExecutionContextHost([
      {
        user: {
          permissions // Set user permissions based on the argument
        }
      }
    ]);
  }

  it('should deny access if the user does not have any permission', () => {
    setupReflectorSpy('required-permission');
    const noPermissions = createMockExecutionContext([]);

    expect(() => guard.canActivate(noPermissions)).toThrow(HttpException);
  });

  it('should deny access if the user has the wrong permission', () => {
    setupReflectorSpy('required-permission');
    const wrongPermission = createMockExecutionContext(['wrong-permission']);

    expect(() => guard.canActivate(wrongPermission)).toThrow(HttpException);
  });

  it('should allow access if the user has the required permission', () => {
    setupReflectorSpy('required-permission');
    const rightPermission = createMockExecutionContext(['required-permission']);

    expect(guard.canActivate(rightPermission)).toBe(true);
  });
});
