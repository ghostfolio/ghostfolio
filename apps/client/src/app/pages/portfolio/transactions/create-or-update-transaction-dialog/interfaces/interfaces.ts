import { User } from '@ghostfolio/common/interfaces';
import { Account, Order } from '@prisma/client';

export interface CreateOrUpdateTransactionDialogParams {
  accountId: string;
  transaction: Order;
  user: User;
}
