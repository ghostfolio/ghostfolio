import { Account } from '@prisma/client';

export interface CreateOrUpdateAccountDialogParams {
  account: Account;
}

export interface Platform {
  id: string;
  name: string;
}
