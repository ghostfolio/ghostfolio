import {ColorScheme, DateRange, UnknownMode, ViewMode} from '@ghostfolio/common/types';

export interface UserSettings {
  baseCurrency?: string;
  benchmark?: string;
  colorScheme?: ColorScheme;
  dateRange?: DateRange;
  emergencyFund?: number;
  isExperimentalFeatures?: boolean;
  isRestrictedView?: boolean;
  language?: string;
  locale?: string;
  savingsRate?: number;
  viewMode?: ViewMode;
  unknownMode?: UnknownMode;
}
