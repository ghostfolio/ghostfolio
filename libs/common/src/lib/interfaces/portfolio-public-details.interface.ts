import { PortfolioPosition } from '@ghostfolio/common/interfaces';

export interface PortfolioPublicDetails {
  holdings: {
    [symbol: string]: Pick<
      PortfolioPosition,
      'allocationCurrent' | 'countries' | 'name' | 'sectors' | 'value'
    >;
  };
}
