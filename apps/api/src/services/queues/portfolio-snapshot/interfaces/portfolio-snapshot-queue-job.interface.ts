import { Filter } from '@ghostfolio/common/interfaces';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

export interface IPortfolioSnapshotQueueJob {
  calculationType: PerformanceCalculationType;
  filters: Filter[];
  userCurrency: string;
  userId: string;
}
