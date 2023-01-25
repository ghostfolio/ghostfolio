import { Order, Account } from '@prisma/client';

export interface Export {
  meta: {
    date: string;
    version: string;
  };
  accounts: Omit<
    Account,
    'createdAt' | 'platformId' | 'updatedAt' | 'userId'
  >[];
  activities: (Omit<
    Order,
    | 'accountUserId'
    | 'createdAt'
    | 'date'
    | 'isDraft'
    | 'symbolProfileId'
    | 'updatedAt'
    | 'userId'
  > & { date: string; symbol: string })[];
}
