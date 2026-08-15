import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { ImpersonationGuard } from '@ghostfolio/api/guards/impersonation.guard';
import { ScopeGuard } from '@ghostfolio/api/guards/scope.guard';
import { Scope } from '@ghostfolio/common/scopes';

import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

export const REQUIRES_SCOPE_KEY = 'requires_scope';

/**
 * Marks a route which requires the given scopes and applies the guards which
 * resolve the impersonation context and evaluate it, hence the ScopeGuard
 * cannot be applied without the ImpersonationGuard preceding it
 */
export function RequiresScope(...requiredScopes: Scope[]) {
  return applyDecorators(
    SetMetadata(REQUIRES_SCOPE_KEY, requiredScopes),
    UseGuards(
      AuthGuard('jwt'),
      HasPermissionGuard,
      ImpersonationGuard,
      ScopeGuard
    )
  );
}
