import { ResponseError, TimelinePosition } from '@ghostfolio/common/interfaces';
import Big from 'big.js';

export interface CurrentPositions extends ResponseError {
  positions: TimelinePosition[];
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
  currentValue: Big;
  totalInvestment: Big;
}
