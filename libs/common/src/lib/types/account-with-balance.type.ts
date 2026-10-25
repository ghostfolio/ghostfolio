import type { Account as AccountModel } from '@ghostfolio/prisma/browser';

export type AccountWithBalance = AccountModel & {
  balance: number;
  cashManagement?: {
    defaultUpdateCash: boolean;
    openingDate: string;
    includeCashInPortfolio?: boolean;
  };
};
