import type { AccountWithBalance } from '@ghostfolio/common/types';

export interface CashDetails {
  accounts: AccountWithBalance[];
  balanceInBaseCurrency: number;
}
