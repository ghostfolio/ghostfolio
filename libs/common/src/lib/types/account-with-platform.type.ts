import type { Account, Platform, Tag } from '@ghostfolio/prisma/browser';

export type AccountWithPlatform = Account & {
  platform?: Platform;
  tags?: Tag[];
};
