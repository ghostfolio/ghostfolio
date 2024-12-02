import { SubscriptionOfferKey } from '@ghostfolio/common/types';

import { DataSource, Platform, SymbolProfile } from '@prisma/client';

import { Statistics } from './statistics.interface';
import { SubscriptionOffer } from './subscription-offer.interface';

export interface InfoItem {
  baseCurrency: string;
  benchmarks: Partial<SymbolProfile>[];
  countriesOfSubscribers?: string[];
  currencies: string[];
  defaultDataSource: DataSource;
  demoAuthToken: string;
  fearAndGreedDataSource?: string;
  globalPermissions: string[];
  isDataGatheringEnabled?: string;
  isReadOnlyMode?: boolean;
  platforms: Platform[];
  statistics: Statistics;
  stripePublicKey?: string;
  subscriptionOffers: { [offer in SubscriptionOfferKey]: SubscriptionOffer };
}
