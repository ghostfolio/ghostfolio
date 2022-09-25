import {
  PortfolioPosition,
  PortfolioSummary
} from '@ghostfolio/common/interfaces';

export interface PortfolioDetails {
  accounts: {
    [id: string]: {
      balance: number;
      currency: string;
      current: number;
      name: string;
      original: number;
    };
  };
  filteredValueInBaseCurrency?: number;
  filteredValueInPercentage: number;
  holdings: { [symbol: string]: PortfolioPosition };
  summary: PortfolioSummary;
  totalValueInBaseCurrency?: number;
}
