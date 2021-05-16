import { Currency } from '@prisma/client';

export interface UserSettings {
  baseCurrency: Currency;
  locale: string;
}
