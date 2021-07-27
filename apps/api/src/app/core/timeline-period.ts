import Big from 'big.js';

export interface TimelinePeriod {
  date: string;
  grossPerformance: Big;
  investment: Big;
  value: Big;
}
