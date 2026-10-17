import { HoldingPerformanceValuation } from './holding-performance-valuation.interface';
import { HoldingPerformance } from './holding-performance.interface';

export interface MethodIndependentHoldingPerformance {
  holdingPerformance: HoldingPerformance;
  valuation?: HoldingPerformanceValuation;
}
