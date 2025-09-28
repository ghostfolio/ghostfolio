import { AccountWithValue } from '../../types/index';

export interface AccountsResponse {
  accounts: AccountWithValue[];
  totalBalanceInBaseCurrency: number;
  totalDividendInBaseCurrency: number;
  totalInterestInBaseCurrency: number;
  totalValueInBaseCurrency: number;
  transactionCount: number;
}
