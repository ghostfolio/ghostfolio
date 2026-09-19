import { HoldingValuationItem } from '@ghostfolio/api/app/portfolio/interfaces/holding-valuation-item.interface';

import { Big } from 'big.js';

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
