import { ALLOW_DURING_IMPERSONATION_KEY } from '@ghostfolio/api/decorators/allow-during-impersonation.decorator';
import { REQUIRES_SCOPE_KEY } from '@ghostfolio/api/decorators/requires-scope.decorator';
import { HEADER_KEY_IMPERSONATION } from '@ghostfolio/common/config';
import { Scope, scopes } from '@ghostfolio/common/scopes';

import { HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';

import { ImpersonationWriteGuard } from './impersonation-write.guard';

describe('Impersonation write guard', () => {
  function createGuard({
    isAllowedDuringImpersonation,
    requiredScopes
  }: {
    isAllowedDuringImpersonation?: boolean;
    requiredScopes?: Scope[];
  } = {}) {
    const reflector = {
      getAllAndOverride: (key: string) => {
        if (key === ALLOW_DURING_IMPERSONATION_KEY) {
          return isAllowedDuringImpersonation;
        }

        if (key === REQUIRES_SCOPE_KEY) {
          return requiredScopes;
        }

        return undefined;
      }
    } as unknown as Reflector;

    return new ImpersonationWriteGuard(reflector);
  }

  function createExecutionContext({
    isImpersonating,
    method
  }: {
    isImpersonating: boolean;
    method: string;
  }) {
    return new ExecutionContextHost([
      {
        method,
        headers: isImpersonating
          ? {
              [HEADER_KEY_IMPERSONATION.toLowerCase()]:
                'ffb08949-2f8a-4b6e-88fd-0f1e6b6b5f5d'
            }
          : {}
      }
    ]);
  }

  it('Allows a read request during an impersonation', () => {
    expect(
      createGuard().canActivate(
        createExecutionContext({ isImpersonating: true, method: 'GET' })
      )
    ).toEqual(true);
  });

  it('Allows a write request without an impersonation', () => {
    expect(
      createGuard().canActivate(
        createExecutionContext({ isImpersonating: false, method: 'POST' })
      )
    ).toEqual(true);
  });

  it('Blocks a write request of a route without scopes', () => {
    const guard = createGuard();

    expect(() => {
      return guard.canActivate(
        createExecutionContext({ isImpersonating: true, method: 'POST' })
      );
    }).toThrow(HttpException);
  });

  // A read scope must not open a route which changes data, because the
  // ScopeGuard grants it to every read access
  it('Blocks a write request of a route with read scopes only', () => {
    const guard = createGuard({ requiredScopes: [scopes.portfolioRead] });

    expect(() => {
      return guard.canActivate(
        createExecutionContext({ isImpersonating: true, method: 'POST' })
      );
    }).toThrow(HttpException);
  });

  it('Leaves a write request of a route with a write scope to the ScopeGuard', () => {
    expect(
      createGuard({
        requiredScopes: [scopes.activityCreate]
      }).canActivate(
        createExecutionContext({ isImpersonating: true, method: 'POST' })
      )
    ).toEqual(true);
  });

  it('Allows a write request of a route which is allowed during an impersonation', () => {
    expect(
      createGuard({ isAllowedDuringImpersonation: true }).canActivate(
        createExecutionContext({ isImpersonating: true, method: 'POST' })
      )
    ).toEqual(true);
  });
});
