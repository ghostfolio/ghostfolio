import { HistoricalDataItem } from '../historical-data-item.interface';
import { PortfolioPerformance } from '../portfolio-performance.interface';
import { ResponseError } from './errors.interface';

export interface PortfolioPerformanceResponse extends ResponseError {
  chart?: HistoricalDataItem[];
  firstOrderDate: Date;
  performance: PortfolioPerformance;
}
