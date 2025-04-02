import { DateRange } from '@ghostfolio/common/types';

import { Big } from 'big.js';

export interface SymbolMetrics {
  currentValues: {
    [date: string]: Big;
  };
  currentValuesWithCurrencyEffect: {
    [date: string]: Big;
  };
  feesWithCurrencyEffect: Big;
  grossPerformance: Big;
  grossPerformancePercentage: Big;
  grossPerformancePercentageWithCurrencyEffect: Big;
  grossPerformanceWithCurrencyEffect: Big;
  hasErrors: boolean;
  initialValue: Big;
  initialValueWithCurrencyEffect: Big;
  investmentValuesAccumulated: {
    [date: string]: Big;
  };
  investmentValuesAccumulatedWithCurrencyEffect: {
    [date: string]: Big;
  };
  investmentValuesWithCurrencyEffect: {
    [date: string]: Big;
  };
  netPerformance: Big;
  netPerformancePercentage: Big;
  netPerformancePercentageWithCurrencyEffectMap: { [key: DateRange]: Big };
  netPerformanceValues: {
    [date: string]: Big;
  };
  netPerformanceValuesWithCurrencyEffect: { [date: string]: Big };
  netPerformanceWithCurrencyEffectMap: { [key: DateRange]: Big };
  timeWeightedInvestment: Big;
  timeWeightedInvestmentValues: {
    [date: string]: Big;
  };
  timeWeightedInvestmentValuesWithCurrencyEffect: {
    [date: string]: Big;
  };
  timeWeightedInvestmentWithCurrencyEffect: Big;
  totalAccountBalanceInBaseCurrency: Big;
  totalDividend: Big;
  totalDividendInBaseCurrency: Big;
  totalInterest: Big;
  totalInterestInBaseCurrency: Big;
  totalInvestment: Big;
  totalInvestmentWithCurrencyEffect: Big;
  unitPrices: {
    [date: string]: Big;
  };
  totalLiabilities: Big;
  totalLiabilitiesInBaseCurrency: Big;
  totalValuables: Big;
  totalValuablesInBaseCurrency: Big;
}
