import { Activity, User } from '@ghostfolio/common/interfaces';

import { Account } from '@prisma/client';

export interface CreateOrUpdateActivityDialogParams {
  accounts: Account[];
  activity: Activity;
  user: User;
}
