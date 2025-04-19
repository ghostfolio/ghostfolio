import { XRayRulesSettings } from '@ghostfolio/common/interfaces/x-ray-rules-settings.interface';
import {
  ColorScheme,
  DateRange,
  HoldingsViewMode,
  ViewMode
} from '@ghostfolio/common/types';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

export interface UserSettings {
  annualInterestRate?: number;
  baseCurrency?: string;
  benchmark?: string;
  colorScheme?: ColorScheme;
  dateRange?: DateRange;
  emergencyFund?: number;
  'filters.accounts'?: string[];
  'filters.dataSource'?: string;
  'filters.symbol'?: string;
  'filters.tags'?: string[];
  holdingsViewMode?: HoldingsViewMode;
  isExperimentalFeatures?: boolean;
  isRestrictedView?: boolean;
  language?: string;
  locale?: string;
  performanceCalculationType?: PerformanceCalculationType;
  projectedTotalAmount?: number;
  retirementDate?: string;
  savingsRate?: number;
  viewMode?: ViewMode;
  xRayRules?: XRayRulesSettings;
}
