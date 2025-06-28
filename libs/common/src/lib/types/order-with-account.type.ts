import { Order, SymbolProfile, Tag } from '@prisma/client';

import { AccountWithPlatform } from './account-with-platform.type';

export type OrderWithAccount = Order & {
  account?: AccountWithPlatform;
  SymbolProfile?: SymbolProfile;
  tags?: Tag[];
};
