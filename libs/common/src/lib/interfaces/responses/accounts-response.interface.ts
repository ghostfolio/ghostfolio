import { AccountWithValue } from '@ghostfolio/common/types';

export interface AccountsResponse {
  accounts: AccountWithValue[];
  totalBalanceInBaseCurrency: number;
  totalDividendInBaseCurrency: number;
  totalInterestInBaseCurrency: number;
  totalValueInBaseCurrency: number;
  transactionCount: number;
}
