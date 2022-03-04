import { Account } from '@prisma/client';

export interface CashDetails {
  accounts: Account[];
  balanceInBaseCurrency: number;
}
