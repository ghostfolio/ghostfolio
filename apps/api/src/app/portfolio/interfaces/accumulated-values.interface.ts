import { Big } from 'big.js';

export interface AccumulatedValues {
  investmentValueWithCurrencyEffect: Big;
  totalAverageInvestmentValue: Big;
  totalAverageInvestmentValueWithCurrencyEffect: Big;
  totalCashValueWithCurrencyEffect: Big;
  totalCurrentValue: Big;
  totalCurrentValueWithCurrencyEffect: Big;
  totalInvestmentValue: Big;
  totalInvestmentValueWithCurrencyEffect: Big;
  totalNetPerformanceValue: Big;
  totalNetPerformanceValueWithCurrencyEffect: Big;
  totalNetWorthValueWithCurrencyEffect: Big;
}
