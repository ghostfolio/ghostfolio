import { DateRange } from '@ghostfolio/common/types';

import { Big } from 'big.js';

export interface SymbolMetrics {
  currentValues: Record<string, Big>;
  currentValuesWithCurrencyEffect: Record<string, Big>;
  feesWithCurrencyEffect: Big;
  grossPerformance: Big;
  grossPerformancePercentage: Big;
  grossPerformancePercentageWithCurrencyEffect: Big;
  grossPerformanceWithCurrencyEffect: Big;
  hasErrors: boolean;
  initialValue: Big;
  initialValueWithCurrencyEffect: Big;
  investmentValuesAccumulated: Record<string, Big>;
  investmentValuesAccumulatedWithCurrencyEffect: Record<string, Big>;
  investmentValuesWithCurrencyEffect: Record<string, Big>;
  netPerformance: Big;
  netPerformancePercentage: Big;
  netPerformancePercentageWithCurrencyEffectMap: Record<DateRange, Big>;
  netPerformanceValues: Record<string, Big>;
  netPerformanceValuesWithCurrencyEffect: Record<string, Big>;
  netPerformanceWithCurrencyEffectMap: Record<DateRange, Big>;
  timeWeightedInvestment: Big;
  timeWeightedInvestmentValues: Record<string, Big>;
  timeWeightedInvestmentValuesWithCurrencyEffect: Record<string, Big>;
  timeWeightedInvestmentWithCurrencyEffect: Big;
  totalAccountBalanceInBaseCurrency: Big;
  totalDividend: Big;
  totalDividendInBaseCurrency: Big;
  totalInterest: Big;
  totalInterestInBaseCurrency: Big;
  totalInvestment: Big;
  totalInvestmentWithCurrencyEffect: Big;
  totalLiabilities: Big;
  totalLiabilitiesInBaseCurrency: Big;
  totalValuables: Big;
  totalValuablesInBaseCurrency: Big;
}
