import { HistoricalDataItem } from '@ghostfolio/api/app/portfolio/interfaces/portfolio-position-detail.interface';

export interface PortfolioChart {
  hasError: boolean;
  isAllTimeHigh: boolean;
  isAllTimeLow: boolean;
  chart: HistoricalDataItem[];
}
