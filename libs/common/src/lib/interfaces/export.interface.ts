import { Account, Order, Tag } from '@prisma/client';

export interface Export {
  meta: {
    date: string;
    version: string;
  };
  accounts: Omit<Account, 'createdAt' | 'updatedAt' | 'userId'>[];
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
  tags: Omit<Tag, 'userId'>[];
  user: { settings: { currency: string } };
}
