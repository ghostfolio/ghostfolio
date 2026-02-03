import { getTooltipPositionerMapTop } from '@ghostfolio/common/chart-helper';

import { Tooltip, TooltipPositionerFunction, ChartType } from 'chart.js';

declare module 'chart.js' {
  interface TooltipPositionerMap {
    top: TooltipPositionerFunction<ChartType>;
  }
}

export function registerChartConfiguration() {
  if (Tooltip.positioners['top']) {
    return;
  }

  Tooltip.positioners.top = function (_elements, eventPosition) {
    return getTooltipPositionerMapTop(this.chart, eventPosition);
  };
}
