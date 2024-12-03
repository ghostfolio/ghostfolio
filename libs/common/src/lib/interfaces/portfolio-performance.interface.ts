export interface PortfolioPerformance {
  annualizedPerformancePercent?: number;
  createdAt: Date;
  currentNetWorth?: number;
  currentValueInBaseCurrency: number;
  netPerformance: number;
  netPerformancePercentage: number;
  netPerformancePercentageWithCurrencyEffect: number;
  netPerformanceWithCurrencyEffect: number;
  totalInvestment: number;
}
