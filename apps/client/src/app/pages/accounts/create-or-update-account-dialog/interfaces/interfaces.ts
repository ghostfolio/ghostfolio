import { User } from '@ghostfolio/common/interfaces';
import { AccountWithBalance } from '@ghostfolio/common/types';
import type { Tag } from '@ghostfolio/prisma/browser';

export interface CreateOrUpdateAccountDialogParams {
  account: Omit<
    AccountWithBalance,
    'createdAt' | 'id' | 'updatedAt' | 'userId'
  > & {
    id: string | null;
    tags?: Tag[];
  };
  user: User;
}
