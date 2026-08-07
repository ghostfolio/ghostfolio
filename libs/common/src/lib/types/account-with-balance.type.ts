import { Account as AccountModel } from '@prisma/client';

export type AccountWithBalance = AccountModel & {
  balance: number;
};
