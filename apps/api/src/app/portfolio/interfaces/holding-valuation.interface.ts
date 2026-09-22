import { Big } from 'big.js';

import { HoldingValuationItem } from './holding-valuation-item.interface';

export interface HoldingValuation {
  currentValues: { [date: string]: Big };
  currentValuesWithCurrencyEffect: { [date: string]: Big };
  initialValue?: Big;
  investmentValuesAccumulated: { [date: string]: Big };
  investmentValuesAccumulatedWithCurrencyEffect: { [date: string]: Big };
  investmentValuesWithCurrencyEffect: { [date: string]: Big };
  items: HoldingValuationItem[];
  netPerformanceValues: { [date: string]: Big };
  netPerformanceValuesWithCurrencyEffect: { [date: string]: Big };
}
