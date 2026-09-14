import type { AccountBalance } from '@ghostfolio/prisma/browser';

export interface AccountBalancesResponse {
  balances: (Pick<AccountBalance, 'accountId' | 'date' | 'id' | 'value'> & {
    valueInBaseCurrency: number;
  })[];
}
