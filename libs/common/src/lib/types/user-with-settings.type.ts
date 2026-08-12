import { SubscriptionType } from '@ghostfolio/common/enums';
import { SubscriptionOffer, UserSettings } from '@ghostfolio/common/interfaces';

import { Account, Settings, User } from '@prisma/client';

// TODO: Compare with User interface
export type UserWithSettings = User & {
  accounts: Account[];
  activitiesCount: number;
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
