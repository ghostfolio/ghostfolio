import { Role } from '@prisma/client';

import { UserWithSettings } from './interfaces';

export const permissions = {
  accessAdminControl: 'accessAdminControl',
  createAccess: 'createAccess',
  createAccount: 'createAccount',
  createOrder: 'createOrder',
  createUserAccount: 'createUserAccount',
  deleteAccess: 'deleteAccess',
  deleteAccount: 'deleteAcccount',
  deleteAuthDevice: 'deleteAuthDevice',
  deleteOrder: 'deleteOrder',
  deleteUser: 'deleteUser',
  enableFearAndGreedIndex: 'enableFearAndGreedIndex',
  enableImport: 'enableImport',
  enableBlog: 'enableBlog',
  enableSocialLogin: 'enableSocialLogin',
  enableStatistics: 'enableStatistics',
  enableSubscription: 'enableSubscription',
  enableSystemMessage: 'enableSystemMessage',
  reportDataGlitch: 'reportDataGlitch',
  toggleReadOnlyMode: 'toggleReadOnlyMode',
  updateAccount: 'updateAccount',
  updateAuthDevice: 'updateAuthDevice',
  updateOrder: 'updateOrder',
  updateUserSettings: 'updateUserSettings',
  updateViewMode: 'updateViewMode'
};

export function getPermissions(aRole: Role): string[] {
  switch (aRole) {
    case 'ADMIN':
      return [
        permissions.accessAdminControl,
        permissions.createAccess,
        permissions.createAccount,
        permissions.createOrder,
        permissions.deleteAccess,
        permissions.deleteAccount,
        permissions.deleteAuthDevice,
        permissions.deleteOrder,
        permissions.deleteUser,
        permissions.updateAccount,
        permissions.updateAuthDevice,
        permissions.updateOrder,
        permissions.updateUserSettings,
        permissions.updateViewMode
      ];

    case 'DEMO':
      return [permissions.createUserAccount];

    case 'USER':
      return [
        permissions.createAccess,
        permissions.createAccount,
        permissions.createOrder,
        permissions.deleteAccess,
        permissions.deleteAccount,
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
