import { FireWealth } from './fire-wealth.interface';
import { PortfolioPerformance } from './portfolio-performance.interface';

export interface PortfolioSummary extends PortfolioPerformance {
  activityCount: number;
  annualizedPerformancePercent: number;
  annualizedPerformancePercentWithCurrencyEffect: number;
  cash: number;
  committedFunds: number;
  dateOfFirstActivity: Date;
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
  fireWealth: FireWealth;
  grossPerformance: number;
  grossPerformanceWithCurrencyEffect: number;
  interestInBaseCurrency: number;
  liabilitiesInBaseCurrency: number;
  totalBuy: number;
  totalSell: number;
  totalValueInBaseCurrency?: number;
}
