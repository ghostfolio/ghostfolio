import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import {
  DataProviderInfo,
  EnhancedSymbolProfile,
  HistoricalDataItem
} from '@ghostfolio/common/interfaces';

import { Account, Tag } from '@prisma/client';

export interface PortfolioPositionDetail {
  accounts: Account[];
  averagePrice: number;
  dataProviderInfo: DataProviderInfo;
  dividendInBaseCurrency: number;
  feeInBaseCurrency: number;
  firstBuyDate: string;
  grossPerformance: number;
  grossPerformancePercent: number;
  grossPerformancePercentWithCurrencyEffect: number;
  grossPerformanceWithCurrencyEffect: number;
  historicalData: HistoricalDataItem[];
  investment: number;
  marketPrice: number;
  maxPrice: number;
  minPrice: number;
  netPerformance: number;
  netPerformancePercent: number;
  netPerformancePercentWithCurrencyEffect: number;
  netPerformanceWithCurrencyEffect: number;
  orders: Activity[];
  quantity: number;
  SymbolProfile: EnhancedSymbolProfile;
  tags: Tag[];
  transactionCount: number;
  value: number;
}

export interface HistoricalDataContainer {
  isAllTimeHigh: boolean;
  isAllTimeLow: boolean;
  items: HistoricalDataItem[];
}
