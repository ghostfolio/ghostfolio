import { EnhancedSymbolProfile } from '@ghostfolio/api/services/interfaces/symbol-profile.interface';
import { OrderWithAccount } from '@ghostfolio/common/types';

export interface PortfolioPositionDetail {
  averagePrice: number;
  firstBuyDate: string;
  grossPerformance: number;
  grossPerformancePercent: number;
  historicalData: HistoricalDataItem[];
  investment: number;
  marketPrice: number;
  maxPrice: number;
  minPrice: number;
  netPerformance: number;
  netPerformancePercent: number;
  orders: OrderWithAccount[];
  quantity: number;
  SymbolProfile: EnhancedSymbolProfile;
  transactionCount: number;
  value: number;
}

export interface HistoricalDataContainer {
  isAllTimeHigh: boolean;
  isAllTimeLow: boolean;
  items: HistoricalDataItem[];
}

export interface HistoricalDataItem {
  averagePrice?: number;
  date: string;
  grossPerformancePercent?: number;
  value: number;
}
