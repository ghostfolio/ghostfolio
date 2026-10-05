import type { Order, SymbolProfile, Tag } from '@ghostfolio/prisma/browser';

import type { AccountWithPlatform } from './account-with-platform.type';

export type OrderWithAccount = Order & {
  account?: AccountWithPlatform;
  SymbolProfile?: SymbolProfile;
  tags?: Tag[];
};
