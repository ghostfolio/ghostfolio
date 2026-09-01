import { AccessLevel } from '@ghostfolio/common/types';

import { AccessType } from '@prisma/client';

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
 * Scopes which read data
 */
export const SCOPES_OF_READ_ACCESS: readonly Scope[] = [
  scopes.accountRead,
  scopes.activityRead,
  scopes.portfolioRead,
  scopes.portfolioReadValues,
  scopes.watchlistRead
];

/**
 * Scopes which change data
 */
export const SCOPES_OF_WRITE_ACCESS: readonly Scope[] = [
  scopes.accountCreate,
  scopes.accountDelete,
  scopes.accountUpdate,
  scopes.activityCreate,
  scopes.activityDelete,
  scopes.activityUpdate,
  scopes.watchlistCreate,
  scopes.watchlistDelete
];

const SCOPES_OF_PUBLIC_ACCESS: readonly Scope[] = [
  scopes.activityRead,
  scopes.portfolioRead
];

export const SCOPES_OF_READ_RESTRICTED_ACCESS: readonly Scope[] =
  SCOPES_OF_READ_ACCESS.filter((scope) => {
    return scope !== scopes.portfolioReadValues;
  });

/**
 * Maximum scopes per access type. The scopes stored on an access are
 * intersected with it, hence a scope which the type does not permit stays
 * ineffective even if it is stored.
 */
const SCOPES_OF_TYPE: Record<AccessType, readonly Scope[]> = {
  MCP: [...SCOPES_OF_READ_RESTRICTED_ACCESS, scopes.activityCreate],
  PRIVATE: Object.values(scopes),
  PUBLIC: SCOPES_OF_PUBLIC_ACCESS
};

/**
 * Access level which the scopes of an access grant
 */
export function getAccessLevel(aScopes: string[] = []): AccessLevel {
  const hasScopeToReadValues = hasScope(aScopes, scopes.portfolioReadValues);

  if (hasAnyScopeOfWriteAccess(aScopes)) {
    return hasScopeToReadValues
      ? 'CREATE_READ_UPDATE_DELETE'
      : 'CREATE_READ_RESTRICTED_UPDATE_DELETE';
  }

  return hasScopeToReadValues ? 'READ' : 'READ_RESTRICTED';
}

export function getScopesOfAccess({
  scopes: scopesOfAccess,
  type
}: {
  scopes?: string[];
  type: AccessType;
}): string[] {
  const scopesToEvaluate = scopesOfAccess ?? [];

  // The type PRIVATE has no restricted write level, hence a write scope stays
  // ineffective without the scope to read the monetary values
  const permitsWriteAccess =
    type !== 'PRIVATE' ||
    hasScope(scopesToEvaluate, scopes.portfolioReadValues);

  // An unknown scope is dropped
  return SCOPES_OF_TYPE[type].filter((scope) => {
    return (
      scopesToEvaluate.includes(scope) &&
      (permitsWriteAccess || !SCOPES_OF_WRITE_ACCESS.includes(scope))
    );
  });
}

/**
 * Scopes which an access level grants
 */
export function getScopesOfAccessLevel(aAccessLevel: AccessLevel): Scope[] {
  switch (aAccessLevel) {
    case 'CREATE_READ_RESTRICTED_UPDATE_DELETE':
      return [...SCOPES_OF_READ_RESTRICTED_ACCESS, ...SCOPES_OF_WRITE_ACCESS];
    case 'CREATE_READ_UPDATE_DELETE':
      return [...SCOPES_OF_READ_ACCESS, ...SCOPES_OF_WRITE_ACCESS];
    case 'READ':
      return [...SCOPES_OF_READ_ACCESS];
    default:
      return [...SCOPES_OF_READ_RESTRICTED_ACCESS];
  }
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

export function hasAnyScopeOfWriteAccess(aScopes: string[] = []) {
  return SCOPES_OF_WRITE_ACCESS.some((scope) => {
    return hasScope(aScopes, scope);
  });
}

export function hasScope(aScopes: string[] = [], aScope: Scope) {
  return aScopes.includes(aScope);
}
