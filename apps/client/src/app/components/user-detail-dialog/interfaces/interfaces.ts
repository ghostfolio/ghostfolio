import { AdminUsers } from '@ghostfolio/common/interfaces';

export interface UserDetailDialogParams {
  deviceType: string;
  userData?: AdminUsers['users'][0];
  userId: string;
}
