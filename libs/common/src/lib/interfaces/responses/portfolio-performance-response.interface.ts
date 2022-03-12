import { PortfolioPerformance } from '../portfolio-performance.interface';
import { ResponseError } from './errors.interface';

export interface PortfolioPerformanceResponse extends ResponseError {
  performance: PortfolioPerformance;
}
