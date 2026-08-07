import { User } from '@ghostfolio/common/interfaces';
import { AccountWithBalance } from '@ghostfolio/common/types';

import { Tag } from '@prisma/client';

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
