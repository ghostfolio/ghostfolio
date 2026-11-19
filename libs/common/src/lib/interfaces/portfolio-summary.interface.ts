import { FireWealth } from './fire-wealth.interface';
import { PortfolioPerformance } from './portfolio-performance.interface';

export interface PortfolioSummary extends PortfolioPerformance {
  /**
   * Independently converted account balances in the user's base currency,
   * before emergency-fund adjustments. Follows account selection and excludes
   * accounts excluded from analysis; does not follow asset/symbol/tag filters.
   * Absent on older servers and null when financial values are masked.
   */
  accountCashInBaseCurrency?: number | null;
  activityCount: number;
  annualizedPerformancePercent: number;
  annualizedPerformancePercentWithCurrencyEffect: number;
  cash: number;
  dateOfFirstActivity?: Date;
  dividendYieldPercent: number;
  dividendYieldPercentWithCurrencyEffect: number;
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
  totalAssetsInBaseCurrency: number;
  totalBuy: number;
  totalCashInBaseCurrency: number;
  totalSell: number;
  totalValueInBaseCurrency?: number;
}
