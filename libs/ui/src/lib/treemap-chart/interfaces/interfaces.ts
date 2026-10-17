import type { PortfolioPosition } from '@ghostfolio/common/interfaces';

import type { ScriptableContext } from 'chart.js';
import type { TreemapDataPoint } from 'chartjs-chart-treemap';

export interface GetColorParams {
  annualizedNetPerformancePercent: number;
  negativeNetPerformancePercentsRange: { max: number; min: number };
  positiveNetPerformancePercentsRange: { max: number; min: number };
}

export type GfTreemapDataPoint = TreemapDataPoint & {
  _data: PortfolioPosition;
};

export type GfTreemapScriptableContext = ScriptableContext<'treemap'> & {
  raw: TreemapDataPoint;
};
