import { Order } from '@prisma/client';

export interface Export {
  meta: {
    date: string;
    version: string;
  };
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
