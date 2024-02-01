import Big from 'big.js';

export interface SymbolMetrics {
  currentValues: {
    [date: string]: Big;
  };
  currentValuesWithCurrencyEffect: {
    [date: string]: Big;
  };
  grossPerformance: Big;
  grossPerformancePercentage: Big;
  grossPerformancePercentageWithCurrencyEffect: Big;
  grossPerformanceWithCurrencyEffect: Big;
  hasErrors: boolean;
  initialValue: Big;
  initialValueWithCurrencyEffect: Big;
  investmentValues: {
    [date: string]: Big;
  };
  investmentValuesWithCurrencyEffect: {
    [date: string]: Big;
  };
  netPerformance: Big;
  netPerformancePercentage: Big;
  netPerformancePercentageWithCurrencyEffect: Big;
  netPerformanceValues: {
    [date: string]: Big;
  };
  netPerformanceValuesWithCurrencyEffect: { [date: string]: Big };
  netPerformanceWithCurrencyEffect: Big;
  timeWeightedInvestment: Big;
  timeWeightedInvestmentValues: {
    [date: string]: Big;
  };
  timeWeightedInvestmentValuesWithCurrencyEffect: {
    [date: string]: Big;
  };
  timeWeightedInvestmentWithCurrencyEffect: Big;
  totalInvestment: Big;
  totalInvestmentWithCurrencyEffect: Big;
  transactionValues: {
    [date: string]: Big;
  };
}
