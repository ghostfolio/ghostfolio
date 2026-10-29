import type { Platform, Tag } from '@ghostfolio/prisma/browser';

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
