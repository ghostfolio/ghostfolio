import { UserWithSettings } from '@ghostfolio/common/types';

import { Role } from '@prisma/client';

export const permissions = {
  accessAdminControl: 'accessAdminControl',
  accessAdminControlBullBoard: 'accessAdminControlBullBoard',
  accessAssistant: 'accessAssistant',
  accessHoldingsChart: 'accessHoldingsChart',
  createAccess: 'createAccess',
  createAccount: 'createAccount',
  createAccountBalance: 'createAccountBalance',
  createActivity: 'createActivity',
  createApiKey: 'createApiKey',
  createDistribution: 'createDistribution',
  createEntity: 'createEntity',
  createKDocument: 'createKDocument',
  createMarketData: 'createMarketData',
  createMarketDataOfOwnAssetProfile: 'createMarketDataOfOwnAssetProfile',
  createOwnTag: 'createOwnTag',
  createPartnership: 'createPartnership',
  createPlatform: 'createPlatform',
  createTag: 'createTag',
  createUserAccount: 'createUserAccount',
  createWatchlistItem: 'createWatchlistItem',
  deleteAccess: 'deleteAccess',
  deleteAccount: 'deleteAccount',
  deleteAccountBalance: 'deleteAccountBalance',
  deleteActivity: 'deleteActivity',
  deleteAuthDevice: 'deleteAuthDevice',
  deleteDistribution: 'deleteDistribution',
  deleteEntity: 'deleteEntity',
  deleteOwnUser: 'deleteOwnUser',
  deletePartnership: 'deletePartnership',
  deletePlatform: 'deletePlatform',
  deleteTag: 'deleteTag',
  deleteUser: 'deleteUser',
  deleteWatchlistItem: 'deleteWatchlistItem',
  enableAuthGoogle: 'enableAuthGoogle',
  enableAuthOidc: 'enableAuthOidc',
  enableAuthToken: 'enableAuthToken',
  enableDataProviderGhostfolio: 'enableDataProviderGhostfolio',
  enableFearAndGreedIndex: 'enableFearAndGreedIndex',
  enableImport: 'enableImport',
  enableBlog: 'enableBlog',
  enableStatistics: 'enableStatistics',
  enableSubscription: 'enableSubscription',
  enableSubscriptionInterstitial: 'enableSubscriptionInterstitial',
  enableSystemMessage: 'enableSystemMessage',
  impersonateAllUsers: 'impersonateAllUsers',
  readAiPrompt: 'readAiPrompt',
  readDocument: 'readDocument',
  readDistribution: 'readDistribution',
  readEntity: 'readEntity',
  readFamilyOfficeDashboard: 'readFamilyOfficeDashboard',
  readFamilyOfficeReport: 'readFamilyOfficeReport',
  readKDocument: 'readKDocument',
  readMarketData: 'readMarketData',
  readMarketDataOfMarkets: 'readMarketDataOfMarkets',
  readMarketDataOfOwnAssetProfile: 'readMarketDataOfOwnAssetProfile',
  readPlatforms: 'readPlatforms',
  readPlatformsWithAccountCount: 'readPlatformsWithAccountCount',
  readPartnership: 'readPartnership',
  readTags: 'readTags',
  readWatchlist: 'readWatchlist',
  reportDataGlitch: 'reportDataGlitch',
  syncDemoUserAccount: 'syncDemoUserAccount',
  toggleReadOnlyMode: 'toggleReadOnlyMode',
  updateAccount: 'updateAccount',
  updateAccess: 'updateAccess',
  updateActivity: 'updateActivity',
  updateAuthDevice: 'updateAuthDevice',
  updateEntity: 'updateEntity',
  updateKDocument: 'updateKDocument',
  updateMarketData: 'updateMarketData',
  updateMarketDataOfOwnAssetProfile: 'updateMarketDataOfOwnAssetProfile',
  updateOwnAccessToken: 'updateOwnAccessToken',
  updatePlatform: 'updatePlatform',
  updatePartnership: 'updatePartnership',
  updateTag: 'updateTag',
  updateUserSettings: 'updateUserSettings',
  updateViewMode: 'updateViewMode',
  uploadDocument: 'uploadDocument'
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
        permissions.createActivity,
        permissions.createDistribution,
        permissions.createEntity,
        permissions.createKDocument,
        permissions.createPartnership,
        permissions.createWatchlistItem,
        permissions.deleteAccountBalance,
        permissions.deleteWatchlistItem,
        permissions.createMarketData,
        permissions.createMarketDataOfOwnAssetProfile,
        permissions.createOwnTag,
        permissions.createPlatform,
        permissions.createTag,
        permissions.deleteAccess,
        permissions.deleteAccount,
        permissions.deleteActivity,
        permissions.deleteAuthDevice,
        permissions.deleteDistribution,
        permissions.deleteEntity,
        permissions.deletePartnership,
        permissions.deletePlatform,
        permissions.deleteTag,
        permissions.deleteUser,
        permissions.readAiPrompt,
        permissions.readDocument,
        permissions.readDistribution,
        permissions.readEntity,
        permissions.readFamilyOfficeDashboard,
        permissions.readFamilyOfficeReport,
        permissions.readKDocument,
        permissions.readMarketData,
        permissions.readMarketDataOfOwnAssetProfile,
        permissions.readPartnership,
        permissions.readPlatforms,
        permissions.readPlatformsWithAccountCount,
        permissions.readTags,
        permissions.readWatchlist,
        permissions.updateAccount,
        permissions.updateAccess,
        permissions.updateActivity,
        permissions.updateAuthDevice,
        permissions.updateEntity,
        permissions.updateKDocument,
        permissions.updateMarketData,
        permissions.updateMarketDataOfOwnAssetProfile,
        permissions.updatePlatform,
        permissions.updatePartnership,
        permissions.updateTag,
        permissions.updateUserSettings,
        permissions.updateViewMode,
        permissions.uploadDocument
      ];

    case 'DEMO':
      return [
        permissions.accessAssistant,
        permissions.accessHoldingsChart,
        permissions.createUserAccount,
        permissions.readAiPrompt,
        permissions.readWatchlist
      ];

    case 'USER':
      return [
        permissions.accessAssistant,
        permissions.accessHoldingsChart,
        permissions.createAccess,
        permissions.createAccount,
        permissions.createAccountBalance,
        permissions.createActivity,
        permissions.createDistribution,
        permissions.createEntity,
        permissions.createKDocument,
        permissions.createPartnership,
        permissions.createMarketDataOfOwnAssetProfile,
        permissions.createOwnTag,
        permissions.createWatchlistItem,
        permissions.deleteAccess,
        permissions.deleteAccount,
        permissions.deleteAccountBalance,
        permissions.deleteActivity,
        permissions.deleteAuthDevice,
        permissions.deleteDistribution,
        permissions.deleteEntity,
        permissions.deletePartnership,
        permissions.deleteWatchlistItem,
        permissions.readAiPrompt,
        permissions.readDocument,
        permissions.readDistribution,
        permissions.readEntity,
        permissions.readFamilyOfficeDashboard,
        permissions.readFamilyOfficeReport,
        permissions.readKDocument,
        permissions.readMarketDataOfOwnAssetProfile,
        permissions.readPartnership,
        permissions.readPlatforms,
        permissions.readWatchlist,
        permissions.updateAccount,
        permissions.updateAccess,
        permissions.updateActivity,
        permissions.updateAuthDevice,
        permissions.updateEntity,
        permissions.updateKDocument,
        permissions.updateMarketDataOfOwnAssetProfile,
        permissions.updatePartnership,
        permissions.updateUserSettings,
        permissions.updateViewMode,
        permissions.uploadDocument
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
        permission !== permissions.enableAuthGoogle &&
        permission !== permissions.enableAuthOidc &&
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

  const access = user.accessesGet?.find(({ id }) => {
    return id === impersonationId;
  });

  return access?.permissions?.includes('READ_RESTRICTED') ?? true;
}

export function hasRole(aUser: UserWithSettings, aRole: Role) {
  return aUser?.role === aRole;
}

export function isRestrictedView(aUser: UserWithSettings) {
  if (!aUser) {
    return true;
  }

  return aUser?.settings?.settings?.isRestrictedView ?? false;
}
