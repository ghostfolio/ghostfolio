import { Platform, SymbolProfile } from '@prisma/client';

import { Statistics } from './statistics.interface';
import { SubscriptionOffer } from './subscription-offer.interface';

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
  subscriptionOffer?: SubscriptionOffer;
}
