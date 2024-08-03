import { UniqueAsset } from '@ghostfolio/common/interfaces';

import { Role } from '@prisma/client';

export interface AdminData {
  exchangeRates: ({
    label1: string;
    label2: string;
    value: number;
  } & UniqueAsset)[];
  settings: { [key: string]: boolean | object | string | string[] };
  transactionCount: number;
  userCount: number;
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
  version: string;
}
