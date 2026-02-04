import { PortfolioPosition } from '@ghostfolio/common/interfaces';

import { ScriptableContext, TooltipItem } from 'chart.js';
import { TreemapDataPoint } from 'chartjs-chart-treemap';

export interface GetColorParams {
  annualizedNetPerformancePercent: number;
  negativeNetPerformancePercentsRange: { max: number; min: number };
  positiveNetPerformancePercentsRange: { max: number; min: number };
}

export interface GfTreemapScriptableContext extends ScriptableContext<'treemap'> {
  raw: TreemapDataPoint & {
    _data: PortfolioPosition;
  };
}
export interface GfTreemapTooltipItem extends TooltipItem<'treemap'> {
  raw: TreemapDataPoint & {
    _data: PortfolioPosition;
  };
}
