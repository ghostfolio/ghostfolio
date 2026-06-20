import { getTooltipPositionerMapTop } from '@ghostfolio/common/chart-helper';

import { Tooltip, TooltipPositionerFunction, ChartType } from 'chart.js';

interface VerticalHoverLinePluginOptions {
  color?: string;
  width?: number;
}

declare module 'chart.js' {
  interface PluginOptionsByType<TType extends ChartType> {
    verticalHoverLine: TType extends 'line' | 'bar'
      ? VerticalHoverLinePluginOptions
      : never;
  }
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
