import { Role } from '@prisma/client';

export interface AdminUsers {
  users: {
    accountCount: number;
    country: string;
    createdAt: Date;
    engagement: number;
    id: string;
    lastActivity: Date;
    role: Role;
    transactionCount: number;
  }[];
  count: number;
}
