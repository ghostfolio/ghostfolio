import { TimelinePosition } from '@ghostfolio/common/interfaces';
import Big from 'big.js';

export interface CurrentPositions {
  hasErrors: boolean;
  positions: TimelinePosition[];
  grossPerformance: Big;
  grossPerformancePercentage: Big;
  currentValue: Big;
  totalInvestment: Big;
}
