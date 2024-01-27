import { ColorScheme, DateRange, ViewMode } from '@ghostfolio/common/types';

export interface UserSettings {
  annualInterestRate?: number;
  baseCurrency?: string;
  benchmark?: string;
  colorScheme?: ColorScheme;
  dateRange?: DateRange;
  emergencyFund?: number;
  'filters.accounts'?: string[];
  'filters.tags'?: string[];
  isExperimentalFeatures?: boolean;
  isRestrictedView?: boolean;
  language?: string;
  locale?: string;
  projectedTotalAmount?: number;
  retirementDate?: string;
  savingsRate?: number;
  viewMode?: ViewMode;
}
