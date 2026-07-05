import { Account, Platform, Tag } from '@prisma/client';

export type AccountWithPlatform = Account & {
  platform?: Platform;
  tags?: Tag[];
};
