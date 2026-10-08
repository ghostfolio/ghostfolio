import { Big } from 'big.js';

export interface AverageInvestmentItem {
  daysUntilNextItem: number;
  investment: Big;
}
