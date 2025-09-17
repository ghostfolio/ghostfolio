import type { DataSource, Order } from '@prisma/client';

import { PortfolioDetails, PortfolioPosition } from '..';
import { Market } from '../../types';

export interface PublicPortfolioResponse extends PublicPortfolioResponseV1 {
  alias?: string;
  hasDetails: boolean;
  holdings: {
    [symbol: string]: Pick<
      PortfolioPosition,
      | 'allocationInPercentage'
      | 'assetClass'
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
  latestActivities: (Pick<Order, 'date' | 'quantity' | 'type' | 'unitPrice'> & {
    SymbolProfile: {
      dataSource: DataSource;
      name: string;
      symbol: string;
    };
  })[];
  markets: {
    [key in Market]: Pick<
      PortfolioDetails['markets'][key],
      'id' | 'valueInPercentage'
    >;
  };
}

interface PublicPortfolioResponseV1 {
  createdAt: Date;
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
