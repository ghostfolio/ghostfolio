import { Account as AccountModel, Platform } from '@prisma/client';

export type AccountWithValue = AccountModel & {
  balanceInBaseCurrency: number;
  platform?: Platform;
  transactionCount: number;
  value: number;
  valueInBaseCurrency: number;
};
