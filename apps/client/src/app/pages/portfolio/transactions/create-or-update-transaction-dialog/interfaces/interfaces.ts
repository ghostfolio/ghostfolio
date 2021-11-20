import { User } from '@ghostfolio/common/interfaces';
import { Account, Order } from '@prisma/client';

export interface CreateOrUpdateTransactionDialogParams {
  accountId: string;
  accounts: Account[];
  transaction: Order;
  user: User;
}
