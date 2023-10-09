import { PortfolioPerformance } from './portfolio-performance.interface';

export interface PortfolioSummary extends PortfolioPerformance {
  annualizedPerformancePercent: number;
  cash: number;
  committedFunds: number;
  dividend: number;
  emergencyFund: {
    assets: number;
    cash: number;
    total: number;
  };
  excludedAccountsAndActivities: number;
  fees: number;
  fireWealth: number;
  firstOrderDate: Date;
  interest: number;
  items: number;
  liabilities: number;
  netWorth: number;
  ordersCount: number;
  totalBuy: number;
  totalSell: number;
}
