import { Role } from '@prisma/client';

export interface AdminUsers {
  count: number;
  users: {
    accountCount: number;
    country: string;
    createdAt: Date;
    dailyApiRequests: number;
    engagement: number;
    id: string;
    lastActivity: Date;
    role: Role;
    transactionCount: number;
  }[];
}
