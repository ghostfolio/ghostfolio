import { AccountBalance } from '@prisma/client';

export interface AccountBalancesResponse {
  balances: (Pick<AccountBalance, 'date' | 'id' | 'value'> & {
    valueInBaseCurrency: number;
  })[];
}
