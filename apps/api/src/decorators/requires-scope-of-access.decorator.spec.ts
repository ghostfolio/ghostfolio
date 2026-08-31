import { AccessPermissionGuard } from '@ghostfolio/api/guards/access-permission.guard';
import { AccessGuard } from '@ghostfolio/api/guards/access.guard';
import { ScopeGuard } from '@ghostfolio/api/guards/scope.guard';
import { scopes } from '@ghostfolio/common/scopes';

import { GUARDS_METADATA } from '@nestjs/common/constants';
import { MCP_SCOPES_METADATA_KEY } from '@rekog/mcp-nest';

import { RequiresScopeOfAccess } from './requires-scope-of-access.decorator';
import { REQUIRES_SCOPE_KEY } from './requires-scope.decorator';

class TestController {
  @RequiresScopeOfAccess(scopes.portfolioRead)
  public getHoldings() {
    return null;
  }
}

describe('Requires scope of access', () => {
  it('Sets the required scopes', () => {
    expect(
      Reflect.getMetadata(
        REQUIRES_SCOPE_KEY,
        TestController.prototype.getHoldings
      )
    ).toEqual([scopes.portfolioRead]);
  });

  // The transport lists the tools of the scopes of the access only, hence it
  // reads the same scopes as the guards
  it('Gives the required scopes to the transport of the model context protocol', () => {
    expect(
      Reflect.getMetadata(
        MCP_SCOPES_METADATA_KEY,
        TestController.prototype.getHoldings
      )
    ).toEqual([scopes.portfolioRead]);
  });

  it('Applies the guards in the required order', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, TestController.prototype.getHoldings)
    ).toEqual([AccessGuard, ScopeGuard, AccessPermissionGuard]);
  });
});
