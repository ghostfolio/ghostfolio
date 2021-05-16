import { Position } from '@ghostfolio/helper/interfaces';

export interface PortfolioItem {
  date: string;
  grossPerformancePercent: number;
  investment: number;
  positions: { [symbol: string]: Position };
  value: number;
}
