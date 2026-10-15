import { Scope, scopes } from '@ghostfolio/common/scopes';

import { HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';

import { ScopeGuard } from './scope.guard';

describe('Scope guard', () => {
  function createGuard(requiredScopes?: Scope[]) {
    const reflector = {
      getAllAndOverride: () => {
        return requiredScopes;
      }
    } as unknown as Reflector;

    return new ScopeGuard(reflector);
  }

  function createExecutionContext(scopesOfImpersonation?: string[]) {
    return new ExecutionContextHost([
      {
        impersonation: scopesOfImpersonation
          ? { scopes: scopesOfImpersonation }
          : undefined
      }
    ]);
  }

  it('Allows a route without required scopes', () => {
    expect(createGuard().canActivate(createExecutionContext())).toEqual(true);
  });

  it('Allows a context which covers every required scope', () => {
    expect(
      createGuard([scopes.accountRead, scopes.accountUpdate]).canActivate(
        createExecutionContext([
          scopes.accountRead,
          scopes.accountUpdate,
          scopes.portfolioRead
        ])
      )
    ).toEqual(true);
  });

  it('Denies a context which covers one of two required scopes', () => {
    const guard = createGuard([scopes.accountRead, scopes.accountUpdate]);

    expect(() => {
      return guard.canActivate(createExecutionContext([scopes.accountRead]));
    }).toThrow(HttpException);
  });

  it('Denies a missing context', () => {
    const guard = createGuard([scopes.accountRead]);

    expect(() => {
      return guard.canActivate(createExecutionContext());
    }).toThrow(HttpException);
  });
});
