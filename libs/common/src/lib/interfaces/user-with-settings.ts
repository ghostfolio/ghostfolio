import { SubscriptionType } from '@ghostfolio/common/types/subscription.type';
import { Account, Settings, User } from '@prisma/client';

export type UserWithSettings = User & {
  Account: Account[];
  Settings: Settings;
  subscription?: {
    expiresAt?: Date;
    type: SubscriptionType;
  };
};
