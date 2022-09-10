import { DateRange } from '@ghostfolio/common/types';
import { ViewMode } from '@prisma/client';

export interface UserSettings {
  baseCurrency?: string;
  dateRange?: DateRange;
  emergencyFund?: number;
  isExperimentalFeatures?: boolean;
  isRestrictedView?: boolean;
  language?: string;
  locale?: string;
  viewMode?: ViewMode;
}
