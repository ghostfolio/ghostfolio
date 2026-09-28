import { REQUIRES_SCOPE_KEY } from '@ghostfolio/api/decorators/requires-scope.decorator';
import { AccessGuard } from '@ghostfolio/api/guards/access.guard';
import { ScopeGuard } from '@ghostfolio/api/guards/scope.guard';
import { Scope } from '@ghostfolio/common/scopes';

import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { ToolScopes } from '@rekog/mcp-nest';

/**
 * Marks a handler which requires the given scopes of an access, but no
 * authenticated user. The access itself is the credential, hence a client of
 * the model context protocol can use it.
 *
 * The same scopes are declared to the transport of the model context
 * protocol, which lists a tool only for an access whose scopes cover it. The
 * transport refuses the call of a tool which it does not list with a protocol
 * error before the guards and the filter of the exceptions run.
 */
export function RequiresScopeOfAccess(scope: Scope, ...otherScopes: Scope[]) {
  const requiredScopes = [scope, ...otherScopes];

  return applyDecorators(
    SetMetadata(REQUIRES_SCOPE_KEY, requiredScopes),
    ToolScopes(requiredScopes),
    UseGuards(AccessGuard, ScopeGuard)
  );
}
