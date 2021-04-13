import { Currency } from '@prisma/client';

export interface PortfolioPosition {
  currency: Currency;
  exchange?: string;
  grossPerformance: number;
  grossPerformancePercent: number;
  industry?: string;
  investment: number;
  isMarketOpen: boolean;
  marketChange?: number;
  marketChangePercent?: number;
  marketPrice: number;
  name: string;
  platforms: {
    [name: string]: { current: number; original: number };
  };
  quantity: number;
  sector?: string;
  shareCurrent: number;
  shareInvestment: number;
  symbol: string;
  type?: string;
  url?: string;
}
