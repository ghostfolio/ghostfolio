import type { Order } from '@ghostfolio/prisma/browser';

export interface UpdateActivityResponse extends Pick<
  Order,
  | 'accountId'
  | 'accountUserId'
  | 'comment'
  | 'createdAt'
  | 'currency'
  | 'date'
  | 'fee'
  | 'id'
  | 'quantity'
  | 'symbolProfileId'
  | 'type'
  | 'unitPrice'
  | 'updatedAt'
  | 'userId'
> {}
