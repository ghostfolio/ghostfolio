import { Big } from 'big.js';

export interface AccumulatedValues {
  investmentValueWithCurrencyEffect: Big;
  totalAverageInvestmentValue: Big;
  totalAverageInvestmentValueWithCurrencyEffect: Big;
  totalBuyValue: Big;
  totalBuyValueWithCurrencyEffect: Big;
  totalCashValueWithCurrencyEffect: Big;
  totalCurrentValue: Big;
  totalCurrentValueWithCurrencyEffect: Big;
  totalDividendValueWithCurrencyEffect: Big;
  totalInvestmentValue: Big;
  totalInvestmentValueWithCurrencyEffect: Big;
  totalNetPerformanceValue: Big;
  totalNetPerformanceValueWithCurrencyEffect: Big;
  totalNetWorthValueWithCurrencyEffect: Big;
}
