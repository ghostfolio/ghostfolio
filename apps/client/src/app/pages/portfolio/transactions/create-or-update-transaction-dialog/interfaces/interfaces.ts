import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import { User } from '@ghostfolio/common/interfaces';
import { Account } from '@prisma/client';

export interface CreateOrUpdateTransactionDialogParams {
  accountId: string;
  accounts: Account[];
  activity: Activity;
  user: User;
}
