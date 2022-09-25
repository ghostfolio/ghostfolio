import { PortfolioPerformance } from './portfolio-performance.interface';

export interface PortfolioSummary extends PortfolioPerformance {
  annualizedPerformancePercent: number;
  cash: number;
  committedFunds: number;
  dividend: number;
  emergencyFund: number;
  excludedAccountsAndActivities: number;
  fees: number;
  firstOrderDate: Date;
  items: number;
  netWorth: number;
  ordersCount: number;
  totalBuy: number;
  totalSell: number;
}
