import { Big } from 'big.js';

export interface WeightedInvestment {
  grossPerformanceAtStartDate: Big;
  investment: Big;
  sumOfWeightedInvestments: Big;
  totalInvestmentDays: number;
}
