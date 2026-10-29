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
      /** Only set if the activities are filtered by a single holding */
      quantity?: number;
      valueInBaseCurrency: number;
      valueInPercentage?: number;
    };
  };
  createdAt: Date;
  holdings: PortfolioPosition[];
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
