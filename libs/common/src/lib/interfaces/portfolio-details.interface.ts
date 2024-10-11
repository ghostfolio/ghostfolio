import {
  PortfolioPosition,
  PortfolioSummary
} from '@ghostfolio/common/interfaces';
import { Market, MarketAdvanced } from '@ghostfolio/common/types';

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
      id: Market;
      valueInBaseCurrency?: number;
      valueInPercentage: number;
    };
  };
  marketsAdvanced?: {
    [key in MarketAdvanced]: {
      id: MarketAdvanced;
      valueInBaseCurrency?: number;
      valueInPercentage: number;
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
