import { ActivityResponse, User } from '@ghostfolio/common/interfaces';

import { Account } from '@prisma/client';

export interface CreateOrUpdateActivityDialogParams {
  accountId: string;
  accounts: Account[];
  activity: ActivityResponse;
  user: User;
}
