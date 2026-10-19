import { Big } from 'big.js';

import { PortfolioCalculatorActivity } from './portfolio-calculator-activity.interface';

export interface PortfolioCalculatorActivityItem extends PortfolioCalculatorActivity {
  feeInBaseCurrencyWithCurrencyEffect?: Big;
  itemType?: 'end' | 'start';
  taxInBaseCurrencyWithCurrencyEffect?: Big;
  unitPriceFromMarketData?: Big;
  unitPriceInBaseCurrency?: Big;
  unitPriceInBaseCurrencyWithCurrencyEffect?: Big;
}
