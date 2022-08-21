import { ViewMode } from '@prisma/client';

export interface UserSettings {
  baseCurrency?: string;
  isRestrictedView?: boolean;
  language?: string;
  locale: string;
  viewMode?: ViewMode;
}
