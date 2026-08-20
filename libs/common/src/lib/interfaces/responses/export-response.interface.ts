import { MarketDataDto } from '@ghostfolio/common/dtos';

import { Account, Order, Platform, SymbolProfile, Tag } from '@prisma/client';

import { AccountBalance } from '../account-balance.interface';
import { AssetProfileIdentifier } from '../asset-profile-identifier.interface';
import { UserSettings } from '../user-settings.interface';

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
    marketData: MarketDataDto[];
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
