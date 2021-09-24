import { ViewMode } from '@prisma/client';

export interface UserSettings {
  baseCurrency?: string;
  isRestrictedView?: boolean;
  locale: string;
  viewMode?: ViewMode;
}
