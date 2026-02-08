import { AccountWithValue } from '@ghostfolio/common/types';

export interface AccountsResponse {
  accounts: AccountWithValue[];
  activitiesCount: number;
  totalBalanceInBaseCurrency: number;
  totalDividendInBaseCurrency: number;
  totalInterestInBaseCurrency: number;
  totalValueInBaseCurrency: number;
}
