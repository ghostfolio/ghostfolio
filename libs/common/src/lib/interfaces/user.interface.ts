import { SubscriptionOffer } from '@ghostfolio/common/types';
import { SubscriptionType } from '@ghostfolio/common/types/subscription-type.type';

import { Account, Tag } from '@prisma/client';

import { SystemMessage } from './system-message.interface';
import { UserSettings } from './user-settings.interface';

// TODO: Compare with UserWithSettings
export interface User {
  access: {
    alias?: string;
    id: string;
  }[];
  accounts: Account[];
  dateOfFirstActivity: Date;
  id: string;
  permissions: string[];
  settings: UserSettings;
  systemMessage?: SystemMessage;
  subscription: {
    expiresAt?: Date;
    offer: SubscriptionOffer;
    type: SubscriptionType;
  };
  tags: Tag[];
}
