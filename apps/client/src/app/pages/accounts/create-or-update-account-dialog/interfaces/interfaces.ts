import { Account } from '@prisma/client';

export interface CreateOrUpdateAccountDialogParams {
  account: Omit<Account, 'createdAt' | 'id' | 'updatedAt' | 'userId'> & {
    id: string | null;
  };
}
