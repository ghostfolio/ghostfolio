import { Provider, Role } from '@prisma/client';

export interface AdminUsersResponse {
  count: number;
  users: {
    accountCount: number;
    activityCount: number;
    country: string;
    createdAt: Date;
    dailyApiRequests: number;
    engagement: number;
    id: string;
    lastActivity: Date;
    role: Role;
  }[];
}

export interface AdminUserResponse {
  id: string;
  role: Role;
  provider: Provider;
  createdAt: Date;
  updatedAt: Date;

  accountCount: number;
  activityCount: number;
  watchlistCount: number;

  analytics?: {
    country?: string | null;
    dailyApiRequests: number;
    lastActivity?: Date | null;
  };

  subscriptions: {
    id: string;
    expiresAt: Date;
    createdAt: Date;
  }[];

  tags: {
    id: string;
    name: string;
  }[];
}
