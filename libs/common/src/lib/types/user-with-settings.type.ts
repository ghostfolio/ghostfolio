import { SubscriptionOffer, UserSettings } from '@ghostfolio/common/interfaces';
import { SubscriptionType } from '@ghostfolio/common/types';

import { Access, Account, Settings, User } from '@prisma/client';

// TODO: Compare with User interface
export type UserWithSettings = User & {
  accessesGet: Access[];
  accounts: Account[];
  activityCount: number;
  dataProviderGhostfolioDailyRequests: number;
  permissions?: string[];
  Settings: Settings & { settings: UserSettings };
  subscription?: {
    expiresAt?: Date;
    offer: SubscriptionOffer;
    type: SubscriptionType;
  };
};
