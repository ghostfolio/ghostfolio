import { AdminUsers } from '@ghostfolio/common/interfaces';

export interface UserDetailDialogParams {
  userId: string;
  deviceType: string;
  hasImpersonationId: boolean;
  userData?: AdminUsers['users'][0];
}
