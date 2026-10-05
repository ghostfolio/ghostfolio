import type {
  Account,
  Order,
  Platform,
  SymbolProfile,
  Tag
} from '@ghostfolio/prisma/browser';

import type { AccountBalance } from '../account-balance.interface';
import type { AssetProfileIdentifier } from '../asset-profile-identifier.interface';
import type { MarketData } from '../market-data.interface';
import type { UserSettings } from '../user-settings.interface';

export interface ExportResponse {
  accounts: (Omit<Account, 'createdAt' | 'updatedAt' | 'userId'> & {
    balances: AccountBalance[];
    tags?: string[];
  })[];
  activities: (Omit<
    Order,
    | 'accountUserId'
    | 'createdAt'
    | 'date'
    | 'symbolProfileId'
    | 'updatedAt'
    | 'userId'
  > & { date: string } & AssetProfileIdentifier)[];
  assetProfiles: (Omit<
    SymbolProfile,
    | 'createdAt'
    | 'dataGatheringFrequency'
    | 'id'
    | 'scraperConfiguration'
    | 'symbolMapping'
    | 'updatedAt'
    | 'userId'
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
