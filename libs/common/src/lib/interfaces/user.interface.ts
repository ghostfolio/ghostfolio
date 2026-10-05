import type { SubscriptionType } from '@ghostfolio/common/enums';
import type { AccountWithPlatform } from '@ghostfolio/common/types';
import type { Access, Tag } from '@ghostfolio/prisma/browser';
import type { Type as ActivityType } from '@ghostfolio/prisma/enums';

import type { ReferralPartner } from './referral-partner.interface';
import type { SubscriptionOffer } from './subscription-offer.interface';
import type { SystemMessage } from './system-message.interface';
import type { UserSettings } from './user-settings.interface';

// TODO: Compare with UserWithSettings
export interface User {
  access: Pick<
    Access,
    'alias' | 'expiresAt' | 'id' | 'lastUsedAt' | 'scopes'
  >[];
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
