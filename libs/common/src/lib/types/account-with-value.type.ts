import { Account as AccountModel } from '@prisma/client';

export type AccountWithValue = AccountModel & {
  balanceInBaseCurrency: number;
  transactionCount: number;
  value: number;
  valueInBaseCurrency: number;
};
