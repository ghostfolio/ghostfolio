import { Role } from '@prisma/client';

interface AdminUser {
  accountCount: number;
  activityCount: number;
  country: string;
  createdAt: Date;
  dailyApiRequests: number;
  engagement: number;
  id: string;
  lastActivity: Date;
  role: Role;
}

export interface AdminUserResponse extends AdminUser {}

export interface AdminUsersResponse {
  count: number;
  users: AdminUser[];
}
