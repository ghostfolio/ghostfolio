import {
  EnhancedSymbolProfile,
  HistoricalDataItem
} from '@ghostfolio/common/interfaces';
import { OrderWithAccount } from '@ghostfolio/common/types';
import { Tag } from '@prisma/client';

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
  tags: Tag[];
  transactionCount: number;
  value: number;
}

export interface HistoricalDataContainer {
  isAllTimeHigh: boolean;
  isAllTimeLow: boolean;
  items: HistoricalDataItem[];
}
