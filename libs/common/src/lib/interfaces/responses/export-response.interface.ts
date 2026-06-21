import { Account, Order, Platform, SymbolProfile, Tag } from '@prisma/client';

import { AccountBalance } from '../account-balance.interface';
import { AssetProfileIdentifier } from '../asset-profile-identifier.interface';
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
