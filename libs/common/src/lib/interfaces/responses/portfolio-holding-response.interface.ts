import {
  Benchmark,
  DataProviderInfo,
  EnhancedSymbolProfile,
  HistoricalDataItem,
  MarketSentiment
} from '@ghostfolio/common/interfaces';

import { Tag } from '@prisma/client';

export interface PortfolioHoldingResponse {
  activitiesCount: number;
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
  marketSentiment?: MarketSentiment;
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
