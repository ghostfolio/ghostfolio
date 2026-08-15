import { AccessPermission } from '@prisma/client';

/**
 * Scopes describe what a grantee may do on behalf of the granting user. They
 * are a separate axis from the permissions, which describe the capabilities of
 * a role. Both are evaluated, hence a delegation can only narrow the access of
 * the authenticated user and never widen it.
 */
export const scopes = {
  accountRead: 'account:read',
  accountWrite: 'account:write',
  activityRead: 'activity:read',
  activityWrite: 'activity:write',
  portfolioRead: 'portfolio:read',
  portfolioReadValues: 'portfolio:read:values',
  watchlistRead: 'watchlist:read',
  watchlistWrite: 'watchlist:write'
} as const;

export type Scope = (typeof scopes)[keyof typeof scopes];

const SCOPES_OF_PUBLIC_ACCESS: Scope[] = [
  scopes.activityRead,
  scopes.portfolioRead
];

const SCOPES_OF_READ_RESTRICTED_ACCESS: Scope[] = [
  scopes.accountRead,
  scopes.activityRead,
  scopes.portfolioRead,
  scopes.watchlistRead
];

const SCOPES_OF_READ_ACCESS: Scope[] = [
  ...SCOPES_OF_READ_RESTRICTED_ACCESS,
  scopes.portfolioReadValues
];

export const SCOPES_OF_WRITE_ACCESS: Scope[] = [
  scopes.accountWrite,
  scopes.activityWrite,
  scopes.watchlistWrite
];

export function getScopesOfAccess({
  granteeUserId,
  permissions,
  scopes: scopesOfAccess
}: {
  granteeUserId?: string | null;
  permissions?: AccessPermission[];
  scopes?: string[];
}): string[] {
  if (!scopesOfAccess?.length) {
    // TODO: Remove the derivation from the permissions once they have been
    // dropped from the access
    scopesOfAccess = permissions?.includes('READ')
      ? SCOPES_OF_READ_ACCESS
      : SCOPES_OF_READ_RESTRICTED_ACCESS;
  }

  if (granteeUserId) {
    return [...scopesOfAccess];
  }

  // An access which has not been granted to a user is public, hence it is
  // narrowed to the scopes exposed by the public endpoints
  return SCOPES_OF_PUBLIC_ACCESS.filter((scope) => {
    return scopesOfAccess.includes(scope);
  });
}

/**
 * Scopes of a user acting on their own data, which is unrestricted. The
 * permissions of the role are evaluated separately.
 */
export function getScopesOfOwnAccess(): string[] {
  return Object.values(scopes);
}

/**
 * Scopes of an administrator impersonating an arbitrary user, which excludes
 * the monetary values
 */
export function getScopesOfUnrestrictedImpersonation(): string[] {
  return [...SCOPES_OF_READ_RESTRICTED_ACCESS];
}

export function hasScope(aScopes: string[] = [], aScope: Scope) {
  return aScopes.includes(aScope);
}
