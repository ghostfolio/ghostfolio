import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';

import { Tag } from '@prisma/client';

import {
  Benchmark,
  DataProviderInfo,
  EnhancedSymbolProfile,
  HistoricalDataItem
} from '../index';

export interface PortfolioHoldingResponse {
  activities: Activity[];
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
  transactionCount: number;
  value: number;
}
