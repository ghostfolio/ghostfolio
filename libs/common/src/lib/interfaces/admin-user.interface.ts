import type { Subscription } from '@ghostfolio/prisma/browser';
import { Provider, RequestClient, Role } from '@ghostfolio/prisma/enums';

export interface AdminUser {
  accountCount: number;
  activityCount: number;
  country?: string | null;
  createdAt: Date;
  dailyApiRequests: number;
  engagement?: number;
  id: string;
  lastActivity?: Date;
  lastRequestClient?: RequestClient | null;
  provider: Provider;
  role: Role;
  subscription?: Subscription;
  subscriptions?: Subscription[];
}
