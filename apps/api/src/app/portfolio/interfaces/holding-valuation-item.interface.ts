import { PortfolioCalculatorActivityItem } from '@ghostfolio/api/app/portfolio/interfaces/portfolio-calculator-activity-item.interface';

import { Big } from 'big.js';

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
