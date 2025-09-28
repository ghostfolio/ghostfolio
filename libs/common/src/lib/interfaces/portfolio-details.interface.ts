import { Market, MarketAdvanced } from '../types/index';
import { PortfolioPosition, PortfolioSummary } from './index';

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
  createdAt: Date;
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
