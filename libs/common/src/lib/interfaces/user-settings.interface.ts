import { DateRange, ViewMode } from '@ghostfolio/common/types';

import { UniqueAsset } from './unique-asset.interface';

export interface UserSettings {
  baseCurrency?: string;
  benchmark?: UniqueAsset;
  dateRange?: DateRange;
  emergencyFund?: number;
  isExperimentalFeatures?: boolean;
  isRestrictedView?: boolean;
  language?: string;
  locale?: string;
  viewMode?: ViewMode;
}
