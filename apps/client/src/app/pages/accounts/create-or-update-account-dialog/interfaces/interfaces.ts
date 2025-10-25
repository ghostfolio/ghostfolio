import { Account } from '@prisma/client';

export interface CreateOrUpdateAccountDialogParams {
  account: Omit<Account, 'createdAt' | 'updatedAt' | 'userId'>;
}
