import type { Subscription } from '@ghostfolio/prisma/browser';
import type { Provider, Role } from '@ghostfolio/prisma/enums';

export interface AdminUser {
  accountCount: number;
  activityCount: number;
  country: string;
  createdAt: Date;
  dailyApiRequests: number;
  engagement: number;
  id: string;
  lastActivity: Date;
  provider: Provider;
  role: Role;
  subscription?: Subscription;
  subscriptions?: Subscription[];
}
