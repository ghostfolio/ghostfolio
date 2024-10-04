import {
  PortfolioPosition,
  PortfolioSummary
} from '@ghostfolio/common/interfaces';
import { Market } from '@ghostfolio/common/types';

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
  holdings: { [symbol: string]: PortfolioPosition };
  markets?: {
    [key in Market]: {
      name: string;
      value: number;
    };
  };
  platforms: {
    [id: string]: {
      balance: number;
      currency: string;
      name: string;
      valueInBaseCurrency: number;
      valueInPercentage?: number;
    };
  };
  summary?: PortfolioSummary;
}
