import { Account, Tag } from '@prisma/client';

import { UserSettings } from './user-settings.interface';

export interface User {
  access: {
    alias?: string;
    id: string;
  }[];
  accounts: Account[];
  id: string;
  permissions: string[];
  settings: UserSettings;
  subscription: {
    expiresAt?: Date;
    type: 'Basic' | 'Premium';
  };
  tags: Tag[];
}
