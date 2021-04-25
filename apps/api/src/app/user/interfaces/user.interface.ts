import { Account, Currency } from '@prisma/client';

import { Access } from './access.interface';

export interface User {
  access: Access[];
  accounts: Account[];
  alias?: string;
  id: string;
  permissions: string[];
  settings: UserSettings;
  subscription: {
    expiresAt: Date;
    type: 'Trial';
  };
}

export interface UserSettings {
  baseCurrency: Currency;
  locale: string;
}
