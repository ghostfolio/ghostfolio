import { InvestmentItem } from '../investment-item.interface';

export interface PortfolioInvestmentsResponse {
  investments: InvestmentItem[];
  savingsRate: number;
  streaks: { currentStreak: number; longestStreak: number };
}
