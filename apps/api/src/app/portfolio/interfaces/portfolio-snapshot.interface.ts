import { ResponseError, TimelinePosition } from '@ghostfolio/common/interfaces';

import { Big } from 'big.js';

export interface PortfolioSnapshot extends ResponseError {
  currentValueInBaseCurrency: Big;
  grossPerformance: Big;
  grossPerformanceWithCurrencyEffect: Big;
  grossPerformancePercentage: Big;
  grossPerformancePercentageWithCurrencyEffect: Big;
  netAnnualizedPerformance?: Big;
  netAnnualizedPerformanceWithCurrencyEffect?: Big;
  netPerformance: Big;
  netPerformanceWithCurrencyEffect: Big;
  netPerformancePercentage: Big;
  netPerformancePercentageWithCurrencyEffect: Big;
  positions: TimelinePosition[];
  totalFeesWithCurrencyEffect: Big;
  totalInterestWithCurrencyEffect: Big;
  totalInvestment: Big;
  totalInvestmentWithCurrencyEffect: Big;
  totalValuablesWithCurrencyEffect: Big;
}
