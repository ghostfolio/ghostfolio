import { DateRange } from '@ghostfolio/common/types';

import { Big } from 'big.js';

export interface HoldingPerformance {
  averageInvestment: Big;
  averageInvestmentValues: {
    [date: string]: Big;
  };
  averageInvestmentValuesWithCurrencyEffect: {
    [date: string]: Big;
  };
  averageInvestmentWithCurrencyEffect: Big;
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
  totalDividend: Big;
  totalDividendInBaseCurrency: Big;
  totalInterestInBaseCurrency: Big;
  totalInvestment: Big;
  totalInvestmentWithCurrencyEffect: Big;
  totalLiabilitiesInBaseCurrency: Big;
}
