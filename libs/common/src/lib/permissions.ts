import { UserWithSettings } from '@ghostfolio/common/types';

import { Role } from '@prisma/client';

export const permissions = {
  accessAdminControl: 'accessAdminControl',
  accessAssistant: 'accessAssistant',
  accessHoldingsChart: 'accessHoldingsChart',
  createAccess: 'createAccess',
  createAccount: 'createAccount',
  createAccountBalance: 'createAccountBalance',
  createApiKey: 'createApiKey',
  createMarketData: 'createMarketData',
  createOrder: 'createOrder',
  createPlatform: 'createPlatform',
  createTag: 'createTag',
  createUserAccount: 'createUserAccount',
  deleteAccess: 'deleteAccess',
  deleteAccount: 'deleteAcccount',
  deleteAccountBalance: 'deleteAcccountBalance',
  deleteAuthDevice: 'deleteAuthDevice',
  deleteOrder: 'deleteOrder',
  deleteOwnUser: 'deleteOwnUser',
  deletePlatform: 'deletePlatform',
  deleteTag: 'deleteTag',
  deleteUser: 'deleteUser',
  enableDataProviderGhostfolio: 'enableDataProviderGhostfolio',
  enableFearAndGreedIndex: 'enableFearAndGreedIndex',
  enableImport: 'enableImport',
  enableBlog: 'enableBlog',
  enableSocialLogin: 'enableSocialLogin',
  enableStatistics: 'enableStatistics',
  enableSubscription: 'enableSubscription',
  enableSubscriptionInterstitial: 'enableSubscriptionInterstitial',
  enableSystemMessage: 'enableSystemMessage',
  impersonateAllUsers: 'impersonateAllUsers',
  readMarketData: 'readMarketData',
  readPlatforms: 'readPlatforms',
  readTags: 'readTags',
  reportDataGlitch: 'reportDataGlitch',
  toggleReadOnlyMode: 'toggleReadOnlyMode',
  updateAccount: 'updateAccount',
  updateAuthDevice: 'updateAuthDevice',
  updateMarketData: 'updateMarketData',
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
        permissions.accessHoldingsChart,
        permissions.createAccess,
        permissions.createAccount,
        permissions.createAccountBalance,
        permissions.deleteAccountBalance,
        permissions.createMarketData,
        permissions.createOrder,
        permissions.createPlatform,
        permissions.createTag,
        permissions.deleteAccess,
        permissions.deleteAccount,
        permissions.deleteAuthDevice,
        permissions.deleteOrder,
        permissions.deleteOwnUser,
        permissions.deletePlatform,
        permissions.deleteTag,
        permissions.deleteUser,
        permissions.readMarketData,
        permissions.readPlatforms,
        permissions.readTags,
        permissions.updateAccount,
        permissions.updateAuthDevice,
        permissions.updateMarketData,
        permissions.updateOrder,
        permissions.updatePlatform,
        permissions.updateTag,
        permissions.updateUserSettings,
        permissions.updateViewMode
      ];

    case 'DEMO':
      return [
        permissions.accessAssistant,
        permissions.accessHoldingsChart,
        permissions.createUserAccount
      ];

    case 'USER':
      return [
        permissions.accessAssistant,
        permissions.accessHoldingsChart,
        permissions.createAccess,
        permissions.createAccount,
        permissions.createAccountBalance,
        permissions.createOrder,
        permissions.deleteAccess,
        permissions.deleteAccount,
        permissions.deleteAccountBalance,
        permissions.deleteAuthDevice,
        permissions.deleteOrder,
        permissions.deleteOwnUser,
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

export function hasReadRestrictedAccessPermission({
  impersonationId,
  user
}: {
  impersonationId: string;
  user: UserWithSettings;
}) {
  if (!impersonationId) {
    return false;
  }

  const access = user.Access?.find(({ id }) => {
    return id === impersonationId;
  });

  return access?.permissions?.includes('READ_RESTRICTED') ?? true;
}

export function hasRole(aUser: UserWithSettings, aRole: Role) {
  return aUser?.role === aRole;
}

export function isRestrictedView(aUser: UserWithSettings) {
  return aUser.Settings.settings.isRestrictedView ?? false;
}
