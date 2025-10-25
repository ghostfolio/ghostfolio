import { AdminUsers } from '@ghostfolio/common/interfaces';

export interface UserDetailDialogParams {
  deviceType: string;
  locale: string;
  userData: AdminUsers['users'][0];
}
