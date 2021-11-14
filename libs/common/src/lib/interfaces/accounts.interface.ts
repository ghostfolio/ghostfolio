import { AccountWithValue } from '@ghostfolio/common/types';

export interface Accounts {
  accounts: AccountWithValue[];
  totalBalance: number;
  totalValue: number;
  transactionCount: number;
}
