import { Tag } from '@prisma/client';

import { Statistics } from './statistics.interface';
import { Subscription } from './subscription.interface';
import { UniqueAsset } from './unique-asset.interface';

export interface InfoItem {
  baseCurrency: string;
  benchmarks: UniqueAsset[];
  currencies: string[];
  demoAuthToken: string;
  fearAndGreedDataSource?: string;
  globalPermissions: string[];
  isReadOnlyMode?: boolean;
  lastDataGathering?: Date;
  platforms: { id: string; name: string }[];
  statistics: Statistics;
  stripePublicKey?: string;
  subscriptions: Subscription[];
  systemMessage?: string;
  tags: Tag[];
}
