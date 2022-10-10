import { DateRange, ViewMode, Appearance } from '@ghostfolio/common/types';

export interface UserSettings {
  appearance?: Appearance;
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
