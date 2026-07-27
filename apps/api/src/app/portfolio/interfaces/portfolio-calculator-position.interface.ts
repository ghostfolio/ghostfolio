import { TimelinePosition } from '@ghostfolio/common/models';

export interface PortfolioCalculatorPosition extends TimelinePosition {
  includeInHoldings: boolean;
  includeInPerformance: boolean;
}
