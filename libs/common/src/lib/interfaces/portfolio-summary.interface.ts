import { PortfolioPerformance } from './portfolio-performance.interface';

export interface PortfolioSummary extends PortfolioPerformance {
  activityCount: number;
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
  grossPerformance: number;
  grossPerformanceWithCurrencyEffect: number;
  interest: number;
  items: number;
  liabilities: number;
  totalBuy: number;
  totalSell: number;
  totalValueInBaseCurrency?: number;
}
