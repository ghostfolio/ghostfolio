import { UserWithSettings } from '@ghostfolio/common/types';

import { Role } from '@prisma/client';

export const permissions = {
  accessAdminControl: 'accessAdminControl',
  accessAssistant: 'accessAssistant',
  createAccess: 'createAccess',
  createAccount: 'createAccount',
  createOrder: 'createOrder',
  createPlatform: 'createPlatform',
  createTag: 'createTag',
  createUserAccount: 'createUserAccount',
  deleteAccess: 'deleteAccess',
  deleteAccount: 'deleteAcccount',
  deleteAccountBalance: 'deleteAcccountBalance',
  deleteAuthDevice: 'deleteAuthDevice',
  deleteOrder: 'deleteOrder',
  deletePlatform: 'deletePlatform',
  deleteTag: 'deleteTag',
  deleteUser: 'deleteUser',
  enableFearAndGreedIndex: 'enableFearAndGreedIndex',
  enableImport: 'enableImport',
  enableBlog: 'enableBlog',
  enableSocialLogin: 'enableSocialLogin',
  enableStatistics: 'enableStatistics',
  enableSubscription: 'enableSubscription',
  enableSubscriptionInterstitial: 'enableSubscriptionInterstitial',
  enableSystemMessage: 'enableSystemMessage',
  impersonateAllUsers: 'impersonateAllUsers',
  reportDataGlitch: 'reportDataGlitch',
  toggleReadOnlyMode: 'toggleReadOnlyMode',
  updateAccount: 'updateAccount',
  updateAuthDevice: 'updateAuthDevice',
  updateOrder: 'updateOrder',
  updatePlatform: 'updatePlatform',
  updateTag: 'updateTag',
  updateUserSettings: 'updateUserSettings',
  updateViewMode: 'updateViewMode'
} as const;

export function getPermissions(aRole: Role): string[] {
  switch (aRole) {
    case 'ADMIN':
      return [
        permissions.accessAdminControl,
        permissions.accessAssistant,
        permissions.createAccess,
        permissions.createAccount,
        permissions.deleteAccountBalance,
        permissions.createOrder,
        permissions.createPlatform,
        permissions.createTag,
        permissions.deleteAccess,
        permissions.deleteAccount,
        permissions.deleteAuthDevice,
        permissions.deleteOrder,
        permissions.deletePlatform,
        permissions.deleteTag,
        permissions.deleteUser,
        permissions.updateAccount,
        permissions.updateAuthDevice,
        permissions.updateOrder,
        permissions.updatePlatform,
        permissions.updateTag,
        permissions.updateUserSettings,
        permissions.updateViewMode
      ];

    case 'DEMO':
      return [permissions.accessAssistant, permissions.createUserAccount];

    case 'USER':
      return [
        permissions.accessAssistant,
        permissions.createAccess,
        permissions.createAccount,
        permissions.createOrder,
        permissions.deleteAccess,
        permissions.deleteAccount,
        permissions.deleteAccountBalance,
        permissions.deleteAuthDevice,
        permissions.deleteOrder,
        permissions.updateAccount,
        permissions.updateAuthDevice,
        permissions.updateOrder,
        permissions.updateUserSettings,
        permissions.updateViewMode
      ];

    default:
      return [];
  }
}

export function filterGlobalPermissions(
  aGlobalPermissions: string[],
  aUtmSource: 'ios' | 'trusted-web-activity'
) {
  const globalPermissions = aGlobalPermissions;

  if (aUtmSource === 'ios') {
    return globalPermissions.filter((permission) => {
      return (
        permission !== permissions.enableSocialLogin &&
        permission !== permissions.enableSubscription
      );
    });
  } else if (aUtmSource === 'trusted-web-activity') {
    return globalPermissions.filter((permission) => {
      return permission !== permissions.enableSubscription;
    });
  }

  return globalPermissions;
}

export function hasPermission(
  aPermissions: string[] = [],
  aPermission: string
) {
  return aPermissions.includes(aPermission);
}

export function hasRole(aUser: UserWithSettings, aRole: Role): boolean {
  return aUser?.role === aRole;
}
