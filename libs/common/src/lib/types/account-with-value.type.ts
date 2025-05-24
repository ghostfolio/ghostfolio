import { Account as AccountModel, Platform } from '@prisma/client';

export type AccountWithValue = AccountModel & {
  allocationInPercentage: number;
  balanceInBaseCurrency: number;
  Platform?: Platform;
  transactionCount: number;
  value: number;
  valueInBaseCurrency: number;  
};
