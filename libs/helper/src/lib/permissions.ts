import { Role } from '@prisma/client';

export function isApiTokenAuthorized(aApiToken: string) {
  return aApiToken === 'Bearer fc804dead6ff45b98da4e5530f6aa3cb';
}

export const permissions = {
  accessAdminControl: 'accessAdminControl',
  createAccount: 'createAccount',
  createOrder: 'createOrder',
  deleteOrder: 'deleteOrder',
  readForeignPortfolio: 'readForeignPortfolio',
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
        permissions.createOrder,
        permissions.deleteOrder,
        permissions.readForeignPortfolio,
        permissions.updateOrder,
        permissions.updateUserSettings
      ];

    case 'DEMO':
      return [permissions.createAccount];

    case 'USER':
      return [
        permissions.createOrder,
        permissions.deleteOrder,
        permissions.updateOrder,
        permissions.updateUserSettings
      ];

    default:
      return [];
  }
}
