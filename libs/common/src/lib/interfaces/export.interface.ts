import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';

import {
  Account,
  DataSource,
  Platform,
  SymbolProfile,
  Tag
} from '@prisma/client';

import { AccountBalance } from './account-balance.interface';
import { MarketData } from './market-data.interface';

export interface Export {
  accounts: (Omit<Account, 'createdAt' | 'updatedAt' | 'userId'> & {
    balances: AccountBalance[];
  })[];
  activities: (Omit<
    Activity,
    | 'accountUserId'
    | 'createdAt'
    | 'date'
    | 'feeInAssetProfileCurrency'
    | 'feeInBaseCurrency'
    | 'isDraft'
    | 'symbolProfileId'
    | 'tags'
    | 'unitPriceInAssetProfileCurrency'
    | 'updatedAt'
    | 'userId'
    | 'value'
    | 'valueInBaseCurrency'
  > & { dataSource: DataSource; date: string; symbol: string })[];
  assetProfiles: (Omit<
    SymbolProfile,
    'createdAt' | 'id' | 'updatedAt' | 'userId'
  > & {
    marketData: MarketData[];
  })[];
  meta: {
    date: string;
    version: string;
  };
  platforms: Platform[];
  tags: Omit<Tag, 'userId'>[];
  user: { settings: { currency: string } };
}
