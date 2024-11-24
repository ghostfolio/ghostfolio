import { UserSettings } from '@ghostfolio/common/interfaces';
import { SubscriptionOfferKey } from '@ghostfolio/common/types';
import { SubscriptionType } from '@ghostfolio/common/types/subscription-type.type';

import { Access, Account, Settings, User } from '@prisma/client';

// TODO: Compare with User interface
export type UserWithSettings = User & {
  Access: Access[];
  Account: Account[];
  activityCount: number;
  dataProviderGhostfolioDailyRequests: number;
  permissions?: string[];
  Settings: Settings & { settings: UserSettings };
  subscription?: {
    expiresAt?: Date;
    offer: SubscriptionOfferKey;
    type: SubscriptionType;
  };
};
