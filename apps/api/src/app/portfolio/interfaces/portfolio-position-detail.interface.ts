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
  quantity: number;
  symbol: string;
  transactionCount: number;
}

export interface HistoricalDataItem {
  averagePrice?: number;
  date: string;
  grossPerformancePercent?: number;
  value: number;
}
