import { Big } from 'big.js';

import { PortfolioCalculatorActivityItem } from './portfolio-calculator-activity-item.interface';

export interface HoldingValuationItem extends Pick<
  PortfolioCalculatorActivityItem,
  'date' | 'itemType' | 'type'
> {
  fees: Big;
  feesWithCurrencyEffect: Big;
  grossPerformance: Big;
  grossPerformanceWithCurrencyEffect: Big;
  investment: Big;
  investmentBeforeTransaction: Big;
  investmentBeforeTransactionWithCurrencyEffect: Big;
  investmentWithCurrencyEffect: Big;
  quantity: Big;
  transactionInvestment: Big;
  transactionInvestmentWithCurrencyEffect: Big;
  value: Big;
  valueBeforeTransaction: Big;
  valueBeforeTransactionWithCurrencyEffect: Big;
  valueWithCurrencyEffect: Big;
}
