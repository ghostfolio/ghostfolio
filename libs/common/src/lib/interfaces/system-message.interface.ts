import { SubscriptionType } from '@ghostfolio/common/enums';

export interface SystemMessage {
  message: string;
  routerLink?: string[];
  targetGroups: SubscriptionType[];
}
