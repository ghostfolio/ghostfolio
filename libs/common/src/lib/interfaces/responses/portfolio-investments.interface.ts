import { InvestmentItem } from '../investment-item.interface';

export interface PortfolioInvestmentsResponse {
  investments: InvestmentItem[];
  streaks: { currentStreak: number; longestStreak: number };
}
