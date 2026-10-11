import { Account } from '@prisma/client';

export type AccountToMatch = Pick<Account, 'currency' | 'id' | 'name'>;
