import { REQUIRES_SCOPE_KEY } from '@ghostfolio/api/decorators/requires-scope.decorator';
import { AccessGuard } from '@ghostfolio/api/guards/access.guard';
import { ScopeGuard } from '@ghostfolio/api/guards/scope.guard';
import { Scope } from '@ghostfolio/common/scopes';

import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';

/**
 * Marks a handler which requires the given scopes of an access, but no
 * authenticated user. The access itself is the credential, hence a client of
 * the model context protocol can use it.
 */
export function RequiresScopeOfAccess(...requiredScopes: Scope[]) {
  return applyDecorators(
    SetMetadata(REQUIRES_SCOPE_KEY, requiredScopes),
    UseGuards(AccessGuard, ScopeGuard)
  );
}
