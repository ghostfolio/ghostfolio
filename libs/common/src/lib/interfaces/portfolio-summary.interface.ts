import { PortfolioPerformance } from './portfolio-performance.interface';

export interface PortfolioSummary extends PortfolioPerformance {
  annualizedPerformancePercent: number;
  cash: number;
  dividend: number;
  committedFunds: number;
  emergencyFund: number;
  fees: number;
  firstOrderDate: Date;
  items: number;
  netWorth: number;
  ordersCount: number;
  totalBuy: number;
  totalSell: number;
}
