import { PortfolioPosition } from '@ghostfolio/common/interfaces';

export interface PortfolioPublicDetails {
  alias?: string;
  hasDetails: boolean;
  holdings: {
    [symbol: string]: Pick<
      PortfolioPosition,
      | 'allocationInPercentage'
      | 'countries'
      | 'currency'
      | 'dataSource'
      | 'dateOfFirstActivity'
      | 'markets'
      | 'name'
      | 'netPerformancePercent'
      | 'sectors'
      | 'symbol'
      | 'url'
      | 'value'
    >;
  };
}
