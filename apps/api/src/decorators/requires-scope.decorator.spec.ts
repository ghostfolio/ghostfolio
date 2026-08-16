import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { ImpersonationGuard } from '@ghostfolio/api/guards/impersonation.guard';
import { ScopeGuard } from '@ghostfolio/api/guards/scope.guard';
import { scopes } from '@ghostfolio/common/scopes';

import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AuthGuard } from '@nestjs/passport';

import { REQUIRES_SCOPE_KEY, RequiresScope } from './requires-scope.decorator';

class TestController {
  @RequiresScope(scopes.portfolioRead)
  public getPortfolio() {
    return null;
  }
}

describe('Requires scope', () => {
  it('Sets the required scopes', () => {
    expect(
      Reflect.getMetadata(
        REQUIRES_SCOPE_KEY,
        TestController.prototype.getPortfolio
      )
    ).toEqual([scopes.portfolioRead]);
  });

  it('Applies the guards in the required order', () => {
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        TestController.prototype.getPortfolio
      )
    ).toEqual([
      AuthGuard('jwt'),
      HasPermissionGuard,
      ImpersonationGuard,
      ScopeGuard
    ]);
  });
});
