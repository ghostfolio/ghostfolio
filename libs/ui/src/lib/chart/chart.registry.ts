import { getTooltipPositionerMapTop } from '@ghostfolio/common/chart-helper';

import { Chart, Tooltip, TooltipPositionerFunction, ChartType } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';

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

  // Register the annotation plugin early so that every chart is initialized
  // with its state and does not crash on interaction
  Chart.register(annotationPlugin);

  Tooltip.positioners.top = function (_elements, eventPosition) {
    return getTooltipPositionerMapTop(this.chart, eventPosition);
  };
}
