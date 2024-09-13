import { PortfolioPosition } from '../portfolio-position.interface';

export interface PortfolioPublicResponse extends PortfolioPublicResponseV1 {
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
      | 'netPerformancePercentWithCurrencyEffect'
      | 'sectors'
      | 'symbol'
      | 'url'
      | 'valueInBaseCurrency'
      | 'valueInPercentage'
    >;
  };
}

export interface PortfolioPublicResponseV1 {
  performance: {
    '1d': {
      relativeChange: number;
    };
    max: {
      relativeChange: number;
    };
    ytd: {
      relativeChange: number;
    };
  };
}
