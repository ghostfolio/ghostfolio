import { User } from '@ghostfolio/common/interfaces';

import { Account, Tag } from '@prisma/client';

export interface CreateOrUpdateAccountDialogParams {
  account: Omit<Account, 'createdAt' | 'id' | 'updatedAt' | 'userId'> & {
    id: string | null;
    tags?: Tag[];
  };
  user: User;
}
