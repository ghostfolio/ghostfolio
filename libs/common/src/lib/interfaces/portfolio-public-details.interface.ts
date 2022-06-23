import { PortfolioPosition } from '@ghostfolio/common/interfaces';

export interface PortfolioPublicDetails {
  hasDetails: boolean;
  holdings: {
    [symbol: string]: Pick<
      PortfolioPosition,
      | 'allocationCurrent'
      | 'countries'
      | 'currency'
      | 'markets'
      | 'name'
      | 'netPerformancePercent'
      | 'sectors'
      | 'symbol'
      | 'value'
    >;
  };
}
