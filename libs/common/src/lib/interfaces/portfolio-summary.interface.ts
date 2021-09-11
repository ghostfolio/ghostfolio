import { PortfolioPerformance } from './portfolio-performance.interface';

export interface PortfolioSummary extends PortfolioPerformance {
  annualizedPerformancePercent: number;
  cash: number;
  committedFunds: number;
  fees: number;
  firstOrderDate: Date;
  netWorth: number;
  ordersCount: number;
  totalBuy: number;
  totalSell: number;
}
