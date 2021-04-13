import { Currency } from '@prisma/client';

import { Access } from './access.interface';

export interface User {
  access: Access[];
  alias?: string;
  id: string;
  permissions: string[];
  settings: UserSettings;
  subscription: {
    expiresAt: Date;
    type: 'Diamond';
  };
}

export interface UserSettings {
  baseCurrency: Currency;
  locale: string;
}
