import { HistoricalDataItem } from './historical-data-item.interface';

export interface PortfolioChart {
  hasError: boolean;
  isAllTimeHigh: boolean;
  isAllTimeLow: boolean;
  chart: HistoricalDataItem[];
}
