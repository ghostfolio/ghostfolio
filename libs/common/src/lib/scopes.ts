import { AccessPermission } from '@prisma/client';

/**
 * Scopes describe what a grantee may do on behalf of the granting user. They
 * are a separate axis from the permissions, which describe the capabilities of
 * a role. Both are evaluated, hence a delegation can only narrow the access of
 * the authenticated user and never widen it.
 */
export const scopes = {
  accountRead: 'account:read',
  activityRead: 'activity:read',
  portfolioRead: 'portfolio:read',
  portfolioReadValues: 'portfolio:read:values',
  watchlistRead: 'watchlist:read'
} as const;

const SCOPES_OF_READ_RESTRICTED_ACCESS = [
  scopes.accountRead,
  scopes.activityRead,
  scopes.portfolioRead,
  scopes.watchlistRead
];

const SCOPES_OF_READ_ACCESS = [
  ...SCOPES_OF_READ_RESTRICTED_ACCESS,
  scopes.portfolioReadValues
];

export function getScopesOfAccess({
  permissions,
  scopes
}: {
  permissions?: AccessPermission[];
  scopes?: string[];
}): string[] {
  if (scopes?.length) {
    return scopes;
  }

  // TODO: Remove the derivation from the permissions once they have been
  // dropped from the access
  return permissions?.includes('READ')
    ? SCOPES_OF_READ_ACCESS
    : SCOPES_OF_READ_RESTRICTED_ACCESS;
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
  return SCOPES_OF_READ_RESTRICTED_ACCESS;
}

export function hasScope(aScopes: string[] = [], aScope: string) {
  return aScopes.includes(aScope);
}
