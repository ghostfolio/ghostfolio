import { Platform, Tag } from '@prisma/client';

import { AccountWithBalance } from './account-with-balance.type';

export type AccountWithValue = AccountWithBalance & {
  activitiesCount: number;
  allocationInPercentage: number;
  balanceInBaseCurrency: number;
  dividendInBaseCurrency: number;
  interestInBaseCurrency: number;
  platform?: Platform;
  tags?: Tag[];
  value: number;
  valueInBaseCurrency: number;
};
