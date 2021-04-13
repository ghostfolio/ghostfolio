export interface PortfolioPositionDetail {
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
  quantity: number;
  symbol: string;
}

export interface HistoricalDataItem {
  averagePrice?: number;
  date: string;
  grossPerformancePercent?: number;
  value: number;
}
