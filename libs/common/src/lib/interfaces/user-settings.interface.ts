import { Currency, ViewMode } from '@prisma/client';

export interface UserSettings {
  baseCurrency?: Currency;
  isRestrictedView?: boolean;
  locale: string;
  viewMode?: ViewMode;
}
