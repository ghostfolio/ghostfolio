import { DateRange } from '@ghostfolio/common/types';
import { ViewMode } from '@prisma/client';

export interface UserSettings {
  baseCurrency?: string;
  dateRange?: DateRange;
  isExperimentalFeatures?: boolean;
  isRestrictedView?: boolean;
  language?: string;
  locale?: string;
  viewMode?: ViewMode;
}
