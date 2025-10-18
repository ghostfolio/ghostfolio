import {
  ActivityResponse,
  Benchmark,
  DataProviderInfo,
  EnhancedSymbolProfile,
  HistoricalDataItem
} from '@ghostfolio/common/interfaces';

import { Tag } from '@prisma/client';

export interface PortfolioHoldingResponse {
<<<<<<< HEAD
  activities: ActivityResponse[];
=======
  activities: Activity[];
  activitiesCount: number;
>>>>>>> a9bcd4ee2eb627e2352c41d3800783e46b6af809
  averagePrice: number;
  dataProviderInfo: DataProviderInfo;
  dividendInBaseCurrency: number;
  dividendYieldPercent: number;
  dividendYieldPercentWithCurrencyEffect: number;
  feeInBaseCurrency: number;
  firstBuyDate: string;
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
  SymbolProfile: EnhancedSymbolProfile;
  tags: Tag[];
  value: number;
}
