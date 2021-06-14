import { Role } from '@prisma/client';

export function isApiTokenAuthorized(aApiToken: string) {
  return aApiToken === 'Bearer fc804dead6ff45b98da4e5530f6aa3cb';
}

export const permissions = {
  accessAdminControl: 'accessAdminControl',
  accessFearAndGreedIndex: 'accessFearAndGreedIndex',
  createAccount: 'createAccount',
  createOrder: 'createOrder',
  createUserAccount: 'createUserAccount',
  deleteAccount: 'deleteAcccount',
  deleteAuthDevice: 'deleteAuthDevice',
  deleteOrder: 'deleteOrder',
  deleteUser: 'deleteUser',
  enableSocialLogin: 'enableSocialLogin',
  enableSubscription: 'enableSubscription',
  readForeignPortfolio: 'readForeignPortfolio',
  updateAccount: 'updateAccount',
  updateAuthDevice: 'updateAuthDevice',
  updateOrder: 'updateOrder',
  updateUserSettings: 'updateUserSettings'
};

export function hasPermission(
  aPermissions: string[] = [],
  aPermission: string
) {
  return aPermissions.includes(aPermission);
}

export function getPermissions(aRole: Role): string[] {
  switch (aRole) {
    case 'ADMIN':
      return [
        permissions.accessAdminControl,
        permissions.createAccount,
        permissions.createOrder,
        permissions.deleteAccount,
        permissions.deleteAuthDevice,
        permissions.deleteOrder,
        permissions.deleteUser,
        permissions.readForeignPortfolio,
        permissions.updateAccount,
        permissions.updateAuthDevice,
        permissions.updateOrder,
        permissions.updateUserSettings
      ];

    case 'DEMO':
      return [permissions.createUserAccount];

    case 'USER':
      return [
        permissions.createAccount,
        permissions.createOrder,
        permissions.deleteAccount,
        permissions.deleteAuthDevice,
        permissions.deleteOrder,
        permissions.updateAccount,
        permissions.updateAuthDevice,
        permissions.updateOrder,
        permissions.updateUserSettings
      ];

    default:
      return [];
  }
}
