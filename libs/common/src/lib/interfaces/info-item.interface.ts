import { SubscriptionOffer } from '@ghostfolio/common/types';

import { Platform, SymbolProfile, Tag } from '@prisma/client';

import { Statistics } from './statistics.interface';
import { Subscription } from './subscription.interface';

export interface InfoItem {
  baseCurrency: string;
  benchmarks: Partial<SymbolProfile>[];
  countriesOfSubscribers?: string[];
  currencies: string[];
  demoAuthToken: string;
  fearAndGreedDataSource?: string;
  globalPermissions: string[];
  isDataGatheringEnabled?: string;
  isReadOnlyMode?: boolean;
  platforms: Platform[];
  statistics: Statistics;
  stripePublicKey?: string;
  subscriptions: { [offer in SubscriptionOffer]: Subscription };
  tags: Tag[];
}
