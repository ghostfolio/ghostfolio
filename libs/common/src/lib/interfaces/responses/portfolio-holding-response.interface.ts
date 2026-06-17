import {
  Benchmark,
  DataProviderInfo,
  EnhancedSymbolProfile,
  HistoricalDataItem
} from '@ghostfolio/common/interfaces';

import { Tag } from '@prisma/client';

export interface PortfolioHoldingResponse {
  activitiesCount: number;
  assetProfile: Pick<
    EnhancedSymbolProfile,
    | 'assetClass'
    | 'assetSubClass'
    | 'countries'
    | 'currency'
    | 'dataSource'
    | 'isin'
    | 'name'
    | 'sectors'
    | 'symbol'
    | 'userId'
  >;
  averagePrice: number;
  dataProviderInfo: DataProviderInfo;
  dateOfFirstActivity: string;
  dividendInBaseCurrency: number;
  dividendYieldPercent: number;
  dividendYieldPercentWithCurrencyEffect: number;
  feeInBaseCurrency: number;
  grossPerformance: number;
  grossPerformancePercent: number;
  grossPerformancePercentWithCurrencyEffect: number;
  grossPerformanceWithCurrencyEffect: number;
  historicalData: HistoricalDataItem[];
  investmentInBaseCurrencyWithCurrencyEffect: number;
  marketPrice: number;
  marketPriceMax: number;
  marketPriceMin: number;
  netPerformance: number;
  netPerformancePercent: number;
  netPerformancePercentWithCurrencyEffect: number;
  netPerformanceWithCurrencyEffect: number;
  performances: Benchmark['performances'];
  quantity: number;

  /* @deprecated */
  SymbolProfile: EnhancedSymbolProfile;

  tags: Tag[];
  value: number;
}
