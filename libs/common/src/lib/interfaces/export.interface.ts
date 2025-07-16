import { Account, Order, Platform, SymbolProfile, Tag } from '@prisma/client';

import { AccountBalance } from './account-balance.interface';

export interface Export {
  accounts: (Omit<Account, 'createdAt' | 'updatedAt' | 'userId'> & {
    balances: AccountBalance[];
  })[];
  activities: (Omit<
    Order,
    | 'accountUserId'
    | 'createdAt'
    | 'date'
    | 'isDraft'
    | 'symbolProfileId'
    | 'updatedAt'
    | 'userId'
  > & { assetProfileId?: string; date: string; symbol: string })[];
  assetProfiles: (Omit<SymbolProfile, 'createdAt' | 'updatedAt' | 'userId'> & {
    marketData: { date: string; marketPrice: number }[];
  })[];
  meta: {
    date: string;
    version: string;
  };
  platforms: Platform[];
  tags: Omit<Tag, 'userId'>[];
  user: { settings: { currency: string } };
}
