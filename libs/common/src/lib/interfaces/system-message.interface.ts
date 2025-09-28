import { SubscriptionType } from '../types/subscription-type.type';

export interface SystemMessage {
  message: string;
  routerLink?: string[];
  targetGroups: SubscriptionType[];
}
