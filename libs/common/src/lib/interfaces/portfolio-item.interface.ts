import { Position } from '@ghostfolio/common/interfaces';

export interface PortfolioItem {
  date: string;
  grossPerformancePercent: number;
  investment: number;
  positions: { [symbol: string]: Position };
  value: number;
}
