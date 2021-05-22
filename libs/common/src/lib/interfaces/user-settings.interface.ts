import { Currency, ViewMode } from '@prisma/client';

export interface UserSettings {
  baseCurrency: Currency;
  locale: string;
  viewMode: ViewMode;
}
