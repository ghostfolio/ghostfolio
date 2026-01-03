import { SubscriptionType } from '@ghostfolio/common/enums';
import { AccountWithPlatform } from '@ghostfolio/common/types';

import { Access, Tag } from '@prisma/client';

import { SubscriptionOffer } from './subscription-offer.interface';
import { SystemMessage } from './system-message.interface';
import { UserSettings } from './user-settings.interface';

// TODO: Compare with UserWithSettings
export interface User {
  access: Pick<Access, 'alias' | 'id' | 'permissions'>[];
  accounts: AccountWithPlatform[];
  activitiesCount: number;
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
  tags: (Tag & { isUsed: boolean })[];
}
