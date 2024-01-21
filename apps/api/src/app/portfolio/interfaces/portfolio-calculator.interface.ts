import Big from 'big.js';

import { PortfolioOrder } from './portfolio-order.interface';

export interface PortfolioOrderItem extends PortfolioOrder {
  feeInBaseCurrency?: Big;
  feeInBaseCurrencyWithCurrencyEffect?: Big;
  itemType?: '' | 'start' | 'end';
  unitPriceInBaseCurrency?: Big;
  unitPriceInBaseCurrencyWithCurrencyEffect?: Big;
}
