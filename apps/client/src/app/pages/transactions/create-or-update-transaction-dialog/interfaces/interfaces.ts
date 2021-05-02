import { Account, Order } from '@prisma/client';

export interface CreateOrUpdateTransactionDialogParams {
  accountId: string;
  accounts: Account[];
  transaction: Order;
}
