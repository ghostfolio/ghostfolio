import type { Order } from '@prisma/client';

import { EnhancedSymbolProfile, PortfolioDetails, PortfolioPosition } from '..';
import { Market } from '../../types';
import type { AccountWithPlatform } from '../../types';

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
  latestActivities: (Pick<
    Order,
    'currency' | 'date' | 'quantity' | 'type' | 'unitPrice'
  > & {
    account?: Pick<AccountWithPlatform, 'currency' | 'name' | 'platform'>;
    SymbolProfile?: EnhancedSymbolProfile;
    value: number;
    valueInBaseCurrency: number;
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
