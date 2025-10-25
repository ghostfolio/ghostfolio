import {
  Account,
  DataSource,
  Order,
  Platform,
  SymbolProfile,
  Tag
} from '@prisma/client';

import { AccountBalance } from '../account-balance.interface';
import { MarketData } from '../market-data.interface';
import { UserSettings } from '../user-settings.interface';

export interface ExportResponse {
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
  user: {
    settings: {
      currency: UserSettings['baseCurrency'];
      performanceCalculationType: UserSettings['performanceCalculationType'];
    };
  };
}
