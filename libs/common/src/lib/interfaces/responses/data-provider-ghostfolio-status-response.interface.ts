import { UserWithSettings } from '@ghostfolio/common/types';

export interface DataProviderGhostfolioStatusResponse {
  dailyRequests: number;
  dailyRequestsMax: number;
  isWithinSetupPeriod: boolean;
  subscription: UserWithSettings['subscription'];
}
