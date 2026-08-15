import { AccessPermission } from '@prisma/client';

/**
 * Scopes describe what a grantee may do on behalf of the granting user. They
 * are a separate axis from the permissions, which describe the capabilities of
 * a role. Both are evaluated, hence a delegation can only narrow the access of
 * the authenticated user and never widen it.
 */
export const scopes = {
  accountCreate: 'account:create',
  accountDelete: 'account:delete',
  accountRead: 'account:read',
  accountUpdate: 'account:update',
  activityCreate: 'activity:create',
  activityDelete: 'activity:delete',
  activityRead: 'activity:read',
  activityUpdate: 'activity:update',
  portfolioRead: 'portfolio:read',
  portfolioReadValues: 'portfolio:read:values',
  watchlistCreate: 'watchlist:create',
  watchlistDelete: 'watchlist:delete',
  watchlistRead: 'watchlist:read'
} as const;

export type Scope = (typeof scopes)[keyof typeof scopes];

/**
 * Scopes which change data. A new one has to be added here, so that the
 * ImpersonationWriteGuard keeps blocking the writes it does not cover.
 */
export const SCOPES_OF_WRITE_ACCESS: Scope[] = [
  scopes.accountCreate,
  scopes.accountDelete,
  scopes.accountUpdate,
  scopes.activityCreate,
  scopes.activityDelete,
  scopes.activityUpdate,
  scopes.watchlistCreate,
  scopes.watchlistDelete
];

const SCOPES_OF_PUBLIC_ACCESS: Scope[] = [
  scopes.activityRead,
  scopes.portfolioRead
];

const SCOPES_OF_READ_ACCESS: Scope[] = Object.values(scopes).filter((scope) => {
  return !SCOPES_OF_WRITE_ACCESS.includes(scope);
});

const SCOPES_OF_READ_RESTRICTED_ACCESS: Scope[] = SCOPES_OF_READ_ACCESS.filter(
  (scope) => {
    return scope !== scopes.portfolioReadValues;
  }
);

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
