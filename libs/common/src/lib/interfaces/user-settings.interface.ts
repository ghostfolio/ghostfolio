import { ViewMode } from '@prisma/client';

export interface UserSettings {
  baseCurrency?: string;
  isExperimentalFeatures?: boolean;
  isRestrictedView?: boolean;
  language?: string;
  locale: string;
  viewMode?: ViewMode;
}
