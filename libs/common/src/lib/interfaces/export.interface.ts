import { Order } from '@prisma/client';

export interface Export {
  meta: {
    date: string;
    version: string;
  };
  orders: Partial<Order>[];
}
