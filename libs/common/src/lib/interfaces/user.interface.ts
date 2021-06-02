import { Access } from '@ghostfolio/api/app/user/interfaces/access.interface';
import { Account } from '@prisma/client';

import { UserSettings } from './user-settings.interface';

export interface User {
  access: Access[];
  accounts: Account[];
  alias?: string;
  id: string;
  permissions: string[];
  settings: UserSettings;
  subscription: {
    expiresAt: Date;
    type: 'Basic' | 'Premium';
  };
}
