import { DateRange, ViewMode } from '@ghostfolio/common/types';

export interface UserSettings {
  baseCurrency?: string;
  benchmark?: string;
  dateRange?: DateRange;
  emergencyFund?: number;
  isExperimentalFeatures?: boolean;
  isRestrictedView?: boolean;
  language?: string;
  locale?: string;
  viewMode?: ViewMode;
}
