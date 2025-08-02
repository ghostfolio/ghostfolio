import { AccountWithValue } from '@ghostfolio/common/types';

export interface AccountsResponse {
  accounts: AccountWithValue[];
  totalBalanceInBaseCurrency: number;
  totalValueInBaseCurrency: number;
  transactionCount: number;
}
