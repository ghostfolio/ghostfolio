import { UserWithSettings } from '@ghostfolio/common/types';

export interface DataProviderGhostfolioStatusResponse {
  dailyRequests: number;
  dailyRequestsMax: number;
  subscription: UserWithSettings['subscription'];
}
