import { SubscriptionType } from '@ghostfolio/common/types/subscription-type.type';

import { Access, Account, Tag } from '@prisma/client';

import { SubscriptionOffer } from './subscription-offer.interface';
import { SystemMessage } from './system-message.interface';
import { UserSettings } from './user-settings.interface';

// TODO: Compare with UserWithSettings
export interface User {
  access: Pick<Access, 'alias' | 'id' | 'permissions'>[];
  accounts: Account[];
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
