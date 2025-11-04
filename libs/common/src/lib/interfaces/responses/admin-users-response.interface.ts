import { Provider, Role, Subscription, Tag } from '@prisma/client';

interface AdminUser {
  accountCount: number;
  activityCount: number;
  analytics?: {
    country?: string | null;
    dailyApiRequests: number;
    lastActivity?: Date | null;
  };
  createdAt: Date;
  id: string;
  provider: Provider;
  role: Role;
  updatedAt: Date;
  watchlistCount: number;
}

export interface AdminUserResponse extends AdminUser {
  subscriptions: Subscription[];
  tags: Tag[];
}

export interface AdminUsersResponse {
  count: number;
  users: (Pick<
    AdminUser,
    'accountCount' | 'activityCount' | 'createdAt' | 'id' | 'role'
  > & {
    country: string;
    dailyApiRequests: number;
    engagement: number;
    lastActivity: Date;
  })[];
}
