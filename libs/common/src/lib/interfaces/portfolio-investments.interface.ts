import { InvestmentItem } from './investment-item.interface';

export interface PortfolioInvestments {
  investments: InvestmentItem[];
  streaks: { currentStreak: number; longestStreak: number };
}
