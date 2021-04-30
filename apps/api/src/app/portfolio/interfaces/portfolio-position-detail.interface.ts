import { Currency } from '@prisma/client';

export interface PortfolioPositionDetail {
  averagePrice: number;
  currency: Currency;
  firstBuyDate: string;
  grossPerformance: number;
  grossPerformancePercent: number;
  historicalData: HistoricalDataItem[];
  investment: number;
  marketPrice: number;
  maxPrice: number;
  minPrice: number;
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
