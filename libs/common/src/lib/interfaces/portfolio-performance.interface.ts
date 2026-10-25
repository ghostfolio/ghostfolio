export interface PortfolioPerformance {
  annualizedPerformancePercent?: number;
  currentNetWorth?: number;
  totalCashInBaseCurrency?: number;
  currentValueInBaseCurrency: number;
  dividendInBaseCurrency: number;
  dividendPercentageWithCurrencyEffect?: number;
  netPerformance: number;
  netPerformancePercentage: number;
  netPerformancePercentageWithCurrencyEffect: number;
  netPerformanceWithCurrencyEffect: number;
  totalInvestment: number;
  totalInvestmentValueWithCurrencyEffect: number;
}
