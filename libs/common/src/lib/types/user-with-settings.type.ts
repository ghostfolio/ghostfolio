import { Access, Account, Settings, User } from '@prisma/client';

import { SubscriptionOffer, UserSettings } from '../interfaces/index';
import { SubscriptionType } from './index';

// TODO: Compare with User interface
export type UserWithSettings = User & {
  accessesGet: Access[];
  accounts: Account[];
  activityCount: number;
  dataProviderGhostfolioDailyRequests: number;
  permissions?: string[];
  settings: Settings & { settings: UserSettings };
  subscription?: {
    expiresAt?: Date;
    offer: SubscriptionOffer;
    type: SubscriptionType;
  };
};
