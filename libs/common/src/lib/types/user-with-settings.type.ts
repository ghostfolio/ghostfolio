import { UserSettings } from '@ghostfolio/common/interfaces';
import { SubscriptionOffer } from '@ghostfolio/common/types';
import { SubscriptionType } from '@ghostfolio/common/types/subscription-type.type';
import { Account, Settings, User } from '@prisma/client';

// TODO: Compare with User interface
export type UserWithSettings = User & {
  Account: Account[];
  activityCount: number;
  permissions?: string[];
  Settings: Settings & { settings: UserSettings };
  subscription?: {
    expiresAt?: Date;
    offer: SubscriptionOffer;
    type: SubscriptionType;
  };
};
