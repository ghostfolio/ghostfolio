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
 * guards refuse the call nevertheless, hence a hidden tool is also refused.
 * At least one scope is required, because the transport refuses an empty
 * list.
 */
export function RequiresScopeOfAccess(...requiredScopes: Scope[]) {
  return applyDecorators(
    SetMetadata(REQUIRES_SCOPE_KEY, requiredScopes),
    ToolScopes(requiredScopes),
    UseGuards(AccessGuard, ScopeGuard)
  );
}
