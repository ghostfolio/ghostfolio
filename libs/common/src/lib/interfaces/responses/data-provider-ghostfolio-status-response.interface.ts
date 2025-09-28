import { UserWithSettings } from '../../types/index';

export interface DataProviderGhostfolioStatusResponse {
  dailyRequests: number;
  dailyRequestsMax: number;
  subscription: UserWithSettings['subscription'];
}
