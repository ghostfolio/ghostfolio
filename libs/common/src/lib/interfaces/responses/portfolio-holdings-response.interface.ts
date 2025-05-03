import {
  PortfolioPosition,
  PortfolioPerformance
} from '@ghostfolio/common/interfaces';

export interface PortfolioHoldingsResponse {
  holdings: PortfolioPosition[];
  performance: PortfolioPerformance;
}
