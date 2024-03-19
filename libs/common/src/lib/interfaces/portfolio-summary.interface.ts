import { PortfolioPerformance } from './portfolio-performance.interface';

export interface PortfolioSummary extends PortfolioPerformance {
  annualizedPerformancePercent: number;
  annualizedPerformancePercentWithCurrencyEffect: number;
  cash: number;
  committedFunds: number;
  dividendInBaseCurrency: number;
  emergencyFund: {
    assets: number;
    cash: number;
    total: number;
  };
  excludedAccountsAndActivities: number;
  fees: number;
  filteredValueInBaseCurrency?: number;
  filteredValueInPercentage?: number;
  fireWealth: number;
  firstOrderDate: Date;
  interest: number;
  items: number;
  liabilities: number;
  ordersCount: number;
  totalBuy: number;
  totalSell: number;
  totalValueInBaseCurrency?: number;
}
