import { Order } from '../../interfaces/order.interface';
import { Account } from '@prisma/client';

export interface CreateOrUpdateTransactionDialogParams {
  accountId: string;
  accounts: Account[];
  transaction: Order;
}
