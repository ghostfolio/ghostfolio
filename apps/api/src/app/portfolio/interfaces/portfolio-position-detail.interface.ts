import { OrderWithAccount } from '@ghostfolio/common/types';
import { AssetClass, AssetSubClass } from '@prisma/client';

export interface PortfolioPositionDetail {
  assetClass?: AssetClass;
  assetSubClass?: AssetSubClass;
  averagePrice: number;
  currency: string;
  firstBuyDate: string;
  grossPerformance: number;
  grossPerformancePercent: number;
  historicalData: HistoricalDataItem[];
  investment: number;
  marketPrice: number;
  maxPrice: number;
  minPrice: number;
  name: string;
  netPerformance: number;
  netPerformancePercent: number;
  orders: OrderWithAccount[];
  quantity: number;
  symbol: string;
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
