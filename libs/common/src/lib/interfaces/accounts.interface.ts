import { AccountWithValue } from '@ghostfolio/common/types';

export interface Accounts {
  accounts: AccountWithValue[];
  totalBalanceInBaseCurrency: number;
  totalValueInBaseCurrency: number;
  transactionCount: number;
}
