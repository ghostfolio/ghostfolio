import { Account, Order, Platform, SymbolProfile } from '@prisma/client';

type AccountWithPlatform = Account & { Platform?: Platform };

export type OrderWithAccount = Order & {
  Account?: AccountWithPlatform;
  SymbolProfile?: SymbolProfile;
};
