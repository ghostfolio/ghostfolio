import { AdminUsers } from '@ghostfolio/common/interfaces';

export interface UserDetailDialogParams {
  deviceType: string;
  hasPermissionForSubscription: boolean;
  locale: string;
  userData: AdminUsers['users'][0];
}
