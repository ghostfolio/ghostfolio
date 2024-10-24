import {
  PortfolioPosition,
  PortfolioSummary
} from '@ghostfolio/common/interfaces';
import { Market, MarketAdvanced } from '@ghostfolio/common/types';

export interface PortfolioDetails {
  accounts: Record<
    string,
    {
      balance: number;
      currency: string;
      name: string;
      valueInBaseCurrency: number;
      valueInPercentage?: number;
    }
  >;
  holdings: Record<string, PortfolioPosition>;
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
  platforms: Record<
    string,
    {
      balance: number;
      currency: string;
      name: string;
      valueInBaseCurrency: number;
      valueInPercentage?: number;
    }
  >;
  summary?: PortfolioSummary;
}
