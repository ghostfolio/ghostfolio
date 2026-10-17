import type { HistoricalDataItem } from '../historical-data-item.interface';
import type { PortfolioPerformance } from '../portfolio-performance.interface';
import type { ResponseError } from './errors.interface';

export interface PortfolioPerformanceResponse extends ResponseError {
  chart?: HistoricalDataItem[];
  dateOfFirstActivity: Date;
  performance: PortfolioPerformance;
}
