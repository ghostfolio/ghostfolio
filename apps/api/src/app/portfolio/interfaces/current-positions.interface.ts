import { ResponseError, TimelinePosition } from '@ghostfolio/common/interfaces';
import Big from 'big.js';

export interface CurrentPositions extends ResponseError {
  positions: TimelinePosition[];
  grossPerformance: Big;
  grossPerformancePercentage: Big;
  netAnnualizedPerformance?: Big;
  netPerformance: Big;
  netPerformancePercentage: Big;
  currentValue: Big;
  totalInvestment: Big;
}
