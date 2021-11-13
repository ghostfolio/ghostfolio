import { Account as AccountModel } from '@prisma/client';

export type AccountWithValue = AccountModel & {
  convertedBalance: number;
  value: number;
};
