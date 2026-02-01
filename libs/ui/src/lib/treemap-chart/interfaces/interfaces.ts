import { PortfolioPosition } from '@ghostfolio/common/interfaces';

import {
  TreemapDataPoint,
  TreemapScriptableContext
} from 'chartjs-chart-treemap';

export interface GetColorParams {
  annualizedNetPerformancePercent: number;
  negativeNetPerformancePercentsRange: { max: number; min: number };
  positiveNetPerformancePercentsRange: { max: number; min: number };
}

export interface GfTreemapChartTooltipContext extends TreemapScriptableContext {
  raw: TreemapDataPoint & {
    _data: PortfolioPosition;
  };
}
