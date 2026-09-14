import type { Order, SymbolProfile, Tag } from '@ghostfolio/prisma/browser';

import { AccountWithPlatform } from './account-with-platform.type';

export type OrderWithAccount = Order & {
  account?: AccountWithPlatform;
  SymbolProfile?: SymbolProfile;
  tags?: Tag[];
};
