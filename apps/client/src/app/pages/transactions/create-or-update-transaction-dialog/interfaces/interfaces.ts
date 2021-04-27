import { Account } from '@prisma/client';

import { Order } from '../../interfaces/order.interface';

export interface CreateOrUpdateTransactionDialogParams {
  accountId: string;
  accounts: Account[];
  transaction: Order;
}
