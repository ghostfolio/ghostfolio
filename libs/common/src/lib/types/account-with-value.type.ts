import { Account as AccountModel, Platform } from '@prisma/client';

export type AccountWithValue = AccountModel & {
  balanceInBaseCurrency: number;
  isLoading?: boolean;
  Platform?: Platform;
  transactionCount: number;
  value: number;
  valueInBaseCurrency: number;
};
