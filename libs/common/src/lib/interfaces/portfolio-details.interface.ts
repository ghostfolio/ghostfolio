import {
  PortfolioPosition,
  PortfolioSummary
} from '@ghostfolio/common/interfaces';

export interface PortfolioDetails {
  accounts: {
    [id: string]: {
      balance: number;
      currency: string;
      name: string;
      valueInBaseCurrency: number;
      valueInPercentage?: number;
    };
  };
  filteredValueInBaseCurrency?: number;
  filteredValueInPercentage: number;
  holdings: { [symbol: string]: PortfolioPosition };
  platforms: {
    [id: string]: {
      balance: number;
      currency: string;
      name: string;
      valueInBaseCurrency: number;
      valueInPercentage?: number;
    };
  };
  summary: PortfolioSummary;
  totalValueInBaseCurrency?: number;
}
