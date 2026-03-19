import { Big } from 'big.js';

import { PortfolioOrder } from './portfolio-order.interface';

export interface PortfolioOrderItem extends PortfolioOrder {
  feeInBaseCurrencyWithCurrencyEffect?: Big;
  itemType?: 'end' | 'start';
  unitPriceFromMarketData?: Big;
  unitPriceInBaseCurrency?: Big;
  unitPriceInBaseCurrencyWithCurrencyEffect?: Big;
}
