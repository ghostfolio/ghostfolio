import { Account as AccountModel, Platform } from '@prisma/client';

export type AccountWithValue = AccountModel & {
  activitiesCount: number;
  allocationInPercentage: number;
  balanceInBaseCurrency: number;
  dividendInBaseCurrency: number;
  interestInBaseCurrency: number;
  platform?: Platform;

  /** @deprecated use activitiesCount instead */
  transactionCount: number;

  value: number;
  valueInBaseCurrency: number;
};
