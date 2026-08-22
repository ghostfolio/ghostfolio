import { SubscriptionType } from '@ghostfolio/common/enums';
import { AccountWithPlatform } from '@ghostfolio/common/types';

import { Access, Tag, Type as ActivityType } from '@prisma/client';

import { ReferralPartner } from './referral-partner.interface';
import { SubscriptionOffer } from './subscription-offer.interface';
import { SystemMessage } from './system-message.interface';
import { UserSettings } from './user-settings.interface';

// TODO: Compare with UserWithSettings
export interface User {
  access: Pick<Access, 'alias' | 'id' | 'scopes'>[];
  accounts: AccountWithPlatform[];
  activitiesCount: number;
  activityTypes: ActivityType[];
  dateOfFirstActivity: Date;
  id: string;
  permissions: string[];
  referralPartners?: ReferralPartner[];
  scopes: string[];
  settings: UserSettings;
  systemMessage?: SystemMessage;
  subscription: {
    expiresAt?: Date;
    offer: SubscriptionOffer;
    type: SubscriptionType;
  };
  tags: (Tag & { isUsed: boolean })[];
}
