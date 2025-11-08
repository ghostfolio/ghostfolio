import { User } from '@ghostfolio/common/interfaces';
import { Activity } from '@ghostfolio/common/interfaces/activities.interface';

import { Account } from '@prisma/client';

export interface CreateOrUpdateActivityDialogParams {
  accounts: Account[];
  activity: Activity;
  user: User;
}
