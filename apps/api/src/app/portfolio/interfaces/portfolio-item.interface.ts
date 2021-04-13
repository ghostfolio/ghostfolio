import { Currency } from '@prisma/client';

export interface PortfolioItem {
  date: string;
  grossPerformancePercent: number;
  investment: number;
  positions: { [symbol: string]: Position };
  value: number;
}

export interface Position {
  averagePrice: number;
  currency: Currency;
  firstBuyDate: string;
  investment: number;
  investmentInOriginalCurrency?: number;
  marketPrice?: number;
  quantity: number;
}
