import { REQUIRES_SCOPE_KEY } from '@ghostfolio/api/decorators/requires-scope.decorator';
import { AccessPermissionGuard } from '@ghostfolio/api/guards/access-permission.guard';
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
 * The scopes are also given to the transport of the model context protocol,
 * which lists the tools of the access only, hence the client never sees a tool
 * which the guards refuse. Both consumers read the same argument, hence the
 * scopes of a handler are declared one time.
 *
 * The AccessPermissionGuard evaluates the permission of the HasPermission
 * decorator, if the handler has one.
 */
export function RequiresScopeOfAccess(...requiredScopes: [Scope, ...Scope[]]) {
  return applyDecorators(
    SetMetadata(REQUIRES_SCOPE_KEY, requiredScopes),
    ToolScopes(requiredScopes),
    UseGuards(AccessGuard, ScopeGuard, AccessPermissionGuard)
  );
}
