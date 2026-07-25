export interface HistoricalDataItem {
  averagePrice?: number;
  date: string;
  grossPerformancePercent?: number;
  investmentValueWithCurrencyEffect?: number;
  marketPrice?: number;
  netPerformance?: number;
  netPerformanceInPercentage?: number;
  netPerformanceInPercentageWithCurrencyEffect?: number;
  netPerformanceWithCurrencyEffect?: number;
  netWorth?: number;
  netWorthInPercentage?: number;
  quantity?: number;
  totalCashInBaseCurrency?: number;
  totalInvestment?: number;
  totalInvestmentValueWithCurrencyEffect?: number;
  value?: number;
  valueInPercentage?: number;
  valueWithCurrencyEffect?: number;
}
