import type { ElementRef } from '@angular/core';
import type {
  Chart,
  ChartOptions,
  ChartType,
  ControllerDatasetOptions,
  Plugin,
  Point,
  ScaleOptions,
  Tick,
  TooltipOptions,
  TooltipPosition
} from 'chart.js';
import type { AnnotationOptions } from 'chartjs-plugin-annotation';
import { format } from 'date-fns';

import {
  DATE_FORMAT,
  DATE_FORMAT_MONTHLY,
  DATE_FORMAT_YEARLY,
  getBackgroundColor,
  getDateFormatString,
  getLocale,
  getTextColor
} from './helper';
import { ColorScheme, GroupBy } from './types';

export function formatGroupedDate({
  date,
  groupBy
}: {
  date: number;
  groupBy: GroupBy;
}) {
  if (groupBy === 'month') {
    return format(date, DATE_FORMAT_MONTHLY);
  } else if (groupBy === 'year') {
    return format(date, DATE_FORMAT_YEARLY);
  }

  return format(date, DATE_FORMAT);
}

export function getChartBorderColor(colorScheme?: ColorScheme) {
  return `rgba(${getTextColor(colorScheme)}, 0.1)`;
}

export function getChartElementsOptions(
  colorScheme?: ColorScheme
): ChartOptions<'bar' | 'line'>['elements'] {
  return {
    line: {
      tension: 0
    },
    point: {
      hoverBackgroundColor: getBackgroundColor(colorScheme),
      hoverRadius: 2,
      radius: 0
    }
  };
}

export function getTimeAxisOptions({
  borderWidth = 1,
  colorScheme,
  display = true,
  locale = getLocale()
}: {
  borderWidth?: number;
  colorScheme?: ColorScheme;
  display?: boolean;
  locale?: string;
}): ScaleOptions<'time'> {
  return {
    display,
    border: {
      color: getChartBorderColor(colorScheme),
      width: borderWidth
    },
    grid: {
      display: false
    },
    time: {
      tooltipFormat: getDateFormatString(locale),
      unit: 'year'
    },
    type: 'time'
  };
}

export function getTooltipOptions<T extends ChartType>({
  colorScheme,
  currency = '',
  groupBy,
  locale = getLocale(),
  unit = ''
}: {
  colorScheme?: ColorScheme;
  currency?: string;
  groupBy?: GroupBy;
  locale?: string;
  unit?: string;
}): Partial<TooltipOptions<T>> {
  const textColor = getTextColor(colorScheme);

  return {
    backgroundColor: getBackgroundColor(colorScheme),
    bodyColor: `rgb(${textColor})`,
    borderWidth: 1,
    borderColor: getChartBorderColor(colorScheme),
    // @ts-expect-error: no need to set all attributes in callbacks
    callbacks: {
      label: (context) => {
        let label = (context.dataset as ControllerDatasetOptions).label ?? '';

        if (label) {
          label += ': ';
        }

        const yPoint = (context.parsed as Point).y;

        if (yPoint !== null) {
          if (currency) {
            label += `${yPoint.toLocaleString(locale, {
              maximumFractionDigits: 2,
              minimumFractionDigits: 2,
              useGrouping: true
            })} ${currency}`;
          } else if (unit) {
            label += `${yPoint.toFixed(2)} ${unit}`;
          } else {
            label += yPoint.toFixed(2);
          }
        }

        return label;
      },
      title: (contexts) => {
        const xPoint = (contexts[0].parsed as Point).x;

        if (groupBy && xPoint !== null) {
          return formatGroupedDate({ groupBy, date: xPoint });
        }

        return contexts[0].label;
      }
    },
    caretSize: 0,
    cornerRadius: 2,
    footerColor: `rgb(${textColor})`,
    itemSort: (a, b) => {
      // Reverse order
      return b.datasetIndex - a.datasetIndex;
    },
    titleColor: `rgb(${textColor})`,
    usePointStyle: true
  };
}

export function getTooltipPositionerMapTop(
  chart: Chart,
  position: TooltipPosition
) {
  if (!position || !chart?.chartArea) {
    return false;
  }

  return {
    x: position.x,
    y: chart.chartArea.top
  };
}

export function getValueAxisOptions({
  colorScheme,
  display = true,
  highlightedValues = [],
  tickCallback
}: {
  colorScheme?: ColorScheme;
  display?: boolean;
  highlightedValues?: number[];
  tickCallback: (
    tickValue: number | string,
    index: number,
    ticks: Tick[]
  ) => string;
}): ScaleOptions<'linear'> {
  const borderColor = getChartBorderColor(colorScheme);

  return {
    display,
    border: {
      display: false
    },
    grid: {
      color: ({ scale, tick }) => {
        if (
          tick.value === 0 ||
          tick.value === scale.max ||
          tick.value === scale.min ||
          highlightedValues.includes(tick.value)
        ) {
          return borderColor;
        }

        return 'transparent';
      }
    },
    position: 'right',
    ticks: {
      display,
      callback: tickCallback,
      mirror: true,
      z: 1
    }
  };
}

/**
 * Returns a plugin which draws a dashed horizontal line at the baseline of a
 * chart above the datasets. Unlike an annotation, it does not follow the
 * custom animations of the data points
 */
export function getBaselinePlugin<T extends 'line' | 'bar'>({
  colorScheme,
  getValue
}: {
  colorScheme?: ColorScheme;
  getValue: () => number | undefined;
}): Plugin<T> {
  return {
    afterDatasetsDraw: (chart) => {
      const value = getValue();
      const yScale = chart.scales['y'];

      if (value === undefined || !yScale) {
        return;
      }

      const y = yScale.getPixelForValue(value);
      const { bottom, left, right, top } = chart.chartArea;

      if (!Number.isFinite(y) || y < top || y > bottom) {
        return;
      }

      const context = chart.ctx;

      context.save();
      context.beginPath();
      context.lineWidth = 1;
      context.setLineDash(BASELINE_DASH);
      context.strokeStyle = getBaselineColor(colorScheme);
      context.moveTo(left, y);
      context.lineTo(right, y);
      context.stroke();
      context.restore();
    },
    id: 'baseline'
  };
}

export function getVerticalHoverLinePlugin<T extends 'line' | 'bar'>(
  chartCanvas: ElementRef<HTMLCanvasElement>,
  colorScheme?: ColorScheme
): Plugin<T, { color: string; width: number }> {
  return {
    afterDatasetsDraw: (chart, _, options) => {
      const active = chart.getActiveElements();

      if (!active || active.length === 0) {
        return;
      }

      const color = options.color ?? `rgb(${getTextColor(colorScheme)})`;
      const width = options.width ?? 1;

      const {
        chartArea: { bottom, top }
      } = chart;
      const xValue = active[0].element.x;

      const context = chartCanvas.nativeElement.getContext('2d');

      if (context) {
        context.lineWidth = width;
        context.strokeStyle = color;

        context.beginPath();
        context.moveTo(xValue, top);
        context.lineTo(xValue, bottom);
        context.stroke();
      }
    },
    id: 'verticalHoverLine'
  };
}

const BASELINE_DASH = [4, 4];

function getBaselineColor(colorScheme?: ColorScheme) {
  return `rgba(${getTextColor(colorScheme)}, 0.4)`;
}

/**
 * Returns a dashed horizontal line at the baseline of a chart (e.g. 0 % for
 * the performance), which stands out from the grid lines
 */
export function getBaselineAnnotation({
  colorScheme,
  value = 0
}: {
  colorScheme?: ColorScheme;
  value?: number;
}): AnnotationOptions<'line'> {
  return {
    borderColor: getBaselineColor(colorScheme),
    borderDash: BASELINE_DASH,
    borderWidth: 1,
    // Above the area of a filled line
    drawTime: 'afterDatasetsDraw',
    scaleID: 'y',
    type: 'line',
    value
  };
}

export function getZeroLineAnnotation(
  colorScheme?: ColorScheme
): AnnotationOptions<'line'> {
  return getBaselineAnnotation({ colorScheme });
}

export function transformTickToAbbreviation(value: number) {
  if (value === 0) {
    return '0';
  } else if (value >= -999 && value <= 999) {
    return value.toFixed(2);
  } else if (value >= -999999 && value <= 999999) {
    return `${value / 1000}K`;
  } else {
    return `${value / 1000000}M`;
  }
}
