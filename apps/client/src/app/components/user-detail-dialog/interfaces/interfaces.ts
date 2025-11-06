import { AdminUsersResponse } from '@ghostfolio/common/interfaces';

export interface UserDetailDialogParams {
  deviceType: string;
  hasPermissionForSubscription: boolean;
  locale: string;
  userData: AdminUsersResponse['users'][0];
}
