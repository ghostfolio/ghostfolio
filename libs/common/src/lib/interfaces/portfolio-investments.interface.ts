import { InvestmentItem } from './investment-item.interface';

export interface PortfolioInvestments {
  firstOrderDate: Date;
  investments: InvestmentItem[];
}
