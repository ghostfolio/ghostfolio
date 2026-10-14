import { Big } from 'big.js';

import { HoldingValuationItem } from './holding-valuation-item.interface';

export interface HoldingValuation {
  buyValuesAccumulated: { [date: string]: Big };
  buyValuesAccumulatedWithCurrencyEffect: { [date: string]: Big };
  currentValues: { [date: string]: Big };
  currentValuesWithCurrencyEffect: { [date: string]: Big };
  dividendValuesWithCurrencyEffect: { [date: string]: Big };
  initialValue?: Big;
  investmentValuesAccumulated: { [date: string]: Big };
  investmentValuesAccumulatedWithCurrencyEffect: { [date: string]: Big };
  investmentValuesWithCurrencyEffect: { [date: string]: Big };
  items: HoldingValuationItem[];
  netPerformanceValues: { [date: string]: Big };
  netPerformanceValuesWithCurrencyEffect: { [date: string]: Big };
}
