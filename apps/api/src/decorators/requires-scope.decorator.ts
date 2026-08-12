import { SetMetadata } from '@nestjs/common';

export const REQUIRES_SCOPE_KEY = 'requires_scope';

/**
 * Marks a controller or a route which requires the given scopes of the
 * impersonation context, which requires the ImpersonationGuard and the
 * ScopeGuard to be applied to the route
 */
export function RequiresScope(...requiredScopes: string[]) {
  return SetMetadata(REQUIRES_SCOPE_KEY, requiredScopes);
}
