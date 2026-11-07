import type { AccountBalance } from '@ghostfolio/prisma/browser';

export interface AccountBalanceResponse extends Pick<
  AccountBalance,
  'accountId' | 'comment' | 'date' | 'id' | 'value'
> {}
