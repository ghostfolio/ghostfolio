export interface HistoricalDataItem {
  averagePrice?: number;
  date: string;
  grossPerformancePercent?: number;
  marketPrice?: number;
  netPerformance?: number;
  netPerformanceWithCurrencyEffect?: number;
  netPerformanceInPercentage?: number;
  netPerformanceInPercentageWithCurrencyEffect?: number;
  netWorth?: number;
  netWorthInPercentage?: number;
  quantity?: number;
  totalAccountBalance?: number;
  totalInvestment?: number;
  totalInvestmentValueWithCurrencyEffect?: number;
  value?: number;
  valueWithCurrencyEffect?: number;
  valueInPercentage?: number;
}
