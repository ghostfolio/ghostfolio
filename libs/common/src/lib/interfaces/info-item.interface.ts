import { DataSource } from '@prisma/client';

import { Statistics } from './statistics.interface';
import { Subscription } from './subscription.interface';

export interface InfoItem {
  currencies: string[];
  demoAuthToken: string;
  globalPermissions: string[];
  lastDataGathering?: Date;
  systemMessage?: string;
  platforms: { id: string; name: string }[];
  primaryDataSource: DataSource;
  statistics: Statistics;
  stripePublicKey?: string;
  subscriptions: Subscription[];
}
