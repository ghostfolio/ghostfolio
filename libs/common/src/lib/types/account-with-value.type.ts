import { Account as AccountModel } from '@prisma/client';

export type AccountWithValue = AccountModel & {
  convertedBalance: number;
  transactionCount: number;
  value: number;
};
