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
  createMarketDataOfOwnAssetProfile: 'createMarketDataOfOwnAssetProfile',
  createOrder: 'createOrder',
  createOwnTag: 'createOwnTag',
  createPlatform: 'createPlatform',
  createTag: 'createTag',
  createUserAccount: 'createUserAccount',
  createWatchlistItem: 'createWatchlistItem',
  deleteAccess: 'deleteAccess',
  deleteAccount: 'deleteAccount',
  deleteAccountBalance: 'deleteAccountBalance',
  deleteAuthDevice: 'deleteAuthDevice',
  deleteOrder: 'deleteOrder',
  deleteOwnUser: 'deleteOwnUser',
  deletePlatform: 'deletePlatform',
  deleteTag: 'deleteTag',
  deleteUser: 'deleteUser',
  deleteWatchlistItem: 'deleteWatchlistItem',
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
  readAiPrompt: 'readAiPrompt',
  readMarketData: 'readMarketData',
  readMarketDataOfOwnAssetProfile: 'readMarketDataOfOwnAssetProfile',
  readPlatforms: 'readPlatforms',
  readTags: 'readTags',
  readWatchlistItems: 'readWatchlistItems',
  reportDataGlitch: 'reportDataGlitch',
  toggleReadOnlyMode: 'toggleReadOnlyMode',
  updateAccount: 'updateAccount',
  updateAuthDevice: 'updateAuthDevice',
  updateMarketData: 'updateMarketData',
  updateMarketDataOfOwnAssetProfile: 'updateMarketDataOfOwnAssetProfile',
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
        permissions.createWatchlistItem,
        permissions.deleteAccountBalance,
        permissions.deleteWatchlistItem,
        permissions.createMarketData,
        permissions.createMarketDataOfOwnAssetProfile,
        permissions.createOrder,
        permissions.createOwnTag,
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
        permissions.readAiPrompt,
        permissions.readMarketData,
        permissions.readMarketDataOfOwnAssetProfile,
        permissions.readPlatforms,
        permissions.readTags,
        permissions.readWatchlistItems,
        permissions.updateAccount,
        permissions.updateAuthDevice,
        permissions.updateMarketData,
        permissions.updateMarketDataOfOwnAssetProfile,
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
        permissions.createUserAccount,
        permissions.readAiPrompt
      ];

    case 'USER':
      return [
        permissions.accessAssistant,
        permissions.accessHoldingsChart,
        permissions.createAccess,
        permissions.createAccount,
        permissions.createAccountBalance,
        permissions.createMarketDataOfOwnAssetProfile,
        permissions.createOrder,
        permissions.createOwnTag,
        permissions.deleteAccess,
        permissions.deleteAccount,
        permissions.deleteAccountBalance,
        permissions.deleteAuthDevice,
        permissions.deleteOrder,
        permissions.deleteOwnUser,
        permissions.readAiPrompt,
        permissions.readMarketDataOfOwnAssetProfile,
        permissions.updateAccount,
        permissions.updateAuthDevice,
        permissions.updateMarketDataOfOwnAssetProfile,
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
