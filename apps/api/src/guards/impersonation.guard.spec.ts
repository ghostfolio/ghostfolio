import { ImpersonationService } from '@ghostfolio/api/services/impersonation/impersonation.service';
import { HEADER_KEY_IMPERSONATION } from '@ghostfolio/common/config';
import { getScopesOfOwnAccess, scopes } from '@ghostfolio/common/scopes';
import type { ImpersonationContext } from '@ghostfolio/common/types';

import { HttpException } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';

import { ImpersonationGuard } from './impersonation.guard';

describe('Impersonation guard', () => {
  const userId = 'ffb08949-2f8a-4b6e-88fd-0f1e6b6b5f5d';

  function createGuard(impersonation: ImpersonationContext) {
    const impersonationService = {
      resolve: async () => {
        return impersonation;
      }
    } as unknown as ImpersonationService;

    return new ImpersonationGuard(impersonationService);
  }

  function createExecutionContext(impersonationId?: string) {
    const request = {
      headers: impersonationId
        ? { [HEADER_KEY_IMPERSONATION.toLowerCase()]: impersonationId }
        : {},
      user: { id: userId }
    };

    return { context: new ExecutionContextHost([request]), request };
  }

  it('Resolves the own access without an identifier', async () => {
    const { context, request } = createExecutionContext();

    const guard = createGuard({
      userId,
      isActive: false,
      scopes: getScopesOfOwnAccess(),
      userSettings: {}
    });

    expect(await guard.canActivate(context)).toEqual(true);
    expect(request['impersonation'].isActive).toEqual(false);
  });

  it('Resolves an identifier of a granted access', async () => {
    const { context, request } = createExecutionContext('an-access-id');

    const guard = createGuard({
      isActive: true,
      scopes: [scopes.portfolioRead],
      userId: 'e2d43f0d-1a41-4b6e-9d5b-6f9a2b7c8d1e',
      userSettings: {}
    });

    expect(await guard.canActivate(context)).toEqual(true);
    expect(request['impersonation'].scopes).toEqual([scopes.portfolioRead]);
  });

  // A revoked or stale identifier must not fall back to the own access,
  // because the client keeps presenting the data as the impersonated data
  it('Denies an identifier which cannot be resolved', async () => {
    const { context } = createExecutionContext('a-revoked-access-id');

    const guard = createGuard({
      userId,
      isActive: false,
      scopes: getScopesOfOwnAccess(),
      userSettings: {}
    });

    await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
  });
});
