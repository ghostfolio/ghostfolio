import { SubscriptionType } from '@ghostfolio/common/types/subscription.type';
import { Account, Settings, User } from '@prisma/client';

import { UserSettings } from './user-settings.interface';

export type UserWithSettings = User & {
  Account: Account[];
  permissions?: string[];
  Settings: Settings & { settings: UserSettings };
  subscription?: {
    expiresAt?: Date;
    type: SubscriptionType;
  };
};
