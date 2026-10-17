import type { Filter } from '@ghostfolio/common/interfaces';
import type { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

export interface PortfolioSnapshotQueueJob {
  calculationType: PerformanceCalculationType;
  filters: Filter[];
  userCurrency: string;
  userId: string;
}
