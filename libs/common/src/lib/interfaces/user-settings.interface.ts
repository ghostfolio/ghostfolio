import { Currency, DisplayMode } from '@prisma/client';

export interface UserSettings {
  baseCurrency: Currency;
  displayMode: DisplayMode;
  locale: string;
}
