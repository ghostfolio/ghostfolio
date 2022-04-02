import { Order } from '@prisma/client';

export interface Export {
  meta: {
    date: string;
    version: string;
  };
  activities: Partial<Order>[];
}
