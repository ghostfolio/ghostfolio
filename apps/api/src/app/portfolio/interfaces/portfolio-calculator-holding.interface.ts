import { PortfolioSnapshotHolding } from '@ghostfolio/common/models';

export interface PortfolioCalculatorHolding extends PortfolioSnapshotHolding {
  includeInHoldings: boolean;
  includeInPerformance: boolean;
}
