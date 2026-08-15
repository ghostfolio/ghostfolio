import { Platform, Tag } from '@prisma/client';

import { AccountWithBalance } from './account-with-balance.type';

export type AccountWithValue = AccountWithBalance & {
  activitiesCount: number;
  allocationInPercentage: number;
  balanceInBaseCurrency: number;
  dividendInBaseCurrency: number;
  interestInBaseCurrency: number;
  platform?: Platform;
  /** Only set if the accounts are filtered by a single holding */
  quantity?: number;
  tags?: Tag[];
  value: number;
  valueInBaseCurrency: number;
};
