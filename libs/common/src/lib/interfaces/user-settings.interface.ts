import { AssetClass } from '@prisma/client';

import {
  ColorScheme,
  DateRange,
  HoldingsViewMode,
  ViewMode
} from '../types/index';
import { PerformanceCalculationType } from '../types/performance-calculation-type.type';
import { XRayRulesSettings } from './x-ray-rules-settings.interface';

export interface UserSettings {
  annualInterestRate?: number;
  baseCurrency?: string;
  benchmark?: string;
  colorScheme?: ColorScheme;
  dateRange?: DateRange;
  emergencyFund?: number;
  'filters.accounts'?: string[];
  'filters.assetClasses'?: AssetClass[];
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
