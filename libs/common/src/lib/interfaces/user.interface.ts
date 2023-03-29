import { Account, Tag } from '@prisma/client';

import { UserSettings } from './user-settings.interface';

// TODO: Compare with UserWithSettings
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
    offer: 'default' | 'renewal';
    type: 'Basic' | 'Premium';
  };
  tags: Tag[];
}
