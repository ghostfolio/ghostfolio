import { Filter } from '@ghostfolio/common/interfaces';

export interface IPortfolioSnapshotQueueJob {
  filters: Filter[];
  userCurrency: string;
  userId: string;
}
