import { Role } from '@prisma/client';

export interface AdminUser {
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
