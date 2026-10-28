import type { AccountBalanceResponse } from './account-balance-response.interface';

export interface AccountBalancesResponse {
  balances: (AccountBalanceResponse & {
    valueInBaseCurrency: number;
  })[];
}
