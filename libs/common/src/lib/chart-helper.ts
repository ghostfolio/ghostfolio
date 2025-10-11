import { Chart, TooltipPosition } from 'chart.js';
import { format } from 'date-fns';

import {
  DATE_FORMAT,
  DATE_FORMAT_MONTHLY,
  DATE_FORMAT_YEARLY,
  getBackgroundColor,
  getLocale,
  getTextColor
} from './helper';
import { ColorScheme, GroupBy } from './types';

/**
 * Standardized Chart Interaction System for Ghostfolio
 *
 * Provides consistent tooltip and hover behavior across all chart types
 */

export interface TooltipConfig {
  colorScheme?: ColorScheme;
  currency?: string;
  groupBy?: GroupBy;
  locale?: string;
  unit?: string;
  showTitle?: boolean;
  showFooter?: boolean;
}

export interface HoverLineConfig {
  colorScheme?: ColorScheme;
  width?: number;
  opacity?: number;
}

/**
 * Create standardized tooltip configuration
 */
export function createTooltipConfig(config: TooltipConfig = {}): any {
  const {
    colorScheme = 'LIGHT',
    currency,
    groupBy,
    locale = getLocale(),
    unit,
    showTitle = true,
    showFooter = false
  } = config;

  return {
    backgroundColor: getBackgroundColor(colorScheme),
    bodyColor: `rgb(${getTextColor(colorScheme)})`,
    borderWidth: 1,
    borderColor: `rgba(${getTextColor(colorScheme)}, 0.1)`,
    caretSize: 0,
    cornerRadius: 4,
    footerColor: `rgb(${getTextColor(colorScheme)})`,
    itemSort: (a, b) => {
      // Reverse order for better UX
      return b.datasetIndex - a.datasetIndex;
    },
    titleColor: `rgb(${getTextColor(colorScheme)})`,
    usePointStyle: true,
    callbacks: {
      label: (context) => {
        let label = context.dataset.label || '';
        if (label) {
          label += ': ';
        }
        if (context.parsed.y !== null) {
          if (currency) {
            label += `${context.parsed.y.toLocaleString(locale, {
              maximumFractionDigits: 2,
              minimumFractionDigits: 2
            })} ${currency}`;
          } else if (unit) {
            label += `${context.parsed.y.toFixed(2)} ${unit}`;
          } else {
            label += context.parsed.y.toFixed(2);
          }
        }
        return label;
      },
      title: (contexts) => {
        if (!showTitle) return '';
        if (groupBy) {
          return formatGroupedDate({ groupBy, date: contexts[0].parsed.x });
        }
        return contexts[0].label;
      },
      footer: () => {
        if (!showFooter) return '';
        return 'Footer content'; // Can be customized per chart type
      }
    }
  };
}

/**
 * Create standardized hover line configuration
 */
export function createHoverLineConfig(config: HoverLineConfig = {}): any {
  const { colorScheme = 'LIGHT', width = 1, opacity = 0.1 } = config;

  return {
    afterDatasetsDraw: (chart, _, options) => {
      const active = chart.getActiveElements();

      if (!active || active.length === 0) {
        return;
      }

      const color =
        options.color || `rgba(${getTextColor(colorScheme)}, ${opacity})`;

      const {
        chartArea: { bottom, top }
      } = chart;
      const xValue = active[0].element.x;

      const context = chart.canvas.getContext('2d');
      if (!context) return;

      context.lineWidth = width;
      context.strokeStyle = color;

      context.beginPath();
      context.moveTo(xValue, top);
      context.lineTo(xValue, bottom);
      context.stroke();
    },
    id: 'verticalHoverLine'
  };
}

/**
 * Create standardized interaction configuration
 */
export function createInteractionConfig(): any {
  return {
    intersect: false,
    mode: 'index',
    axis: 'x'
  };
}

/**
 * Create standardized animation configuration
 */
export function createAnimationConfig(
  duration: number = 1200,
  easing: string = 'easeOutQuart'
): any {
  return {
    duration,
    easing,
    delay: (context) => {
      const delayBetweenPoints = duration / context.chart.data.labels.length;
      return context.index * delayBetweenPoints;
    }
  };
}

/**
 * Create standardized legend configuration
 */
export function createLegendConfig(
  colorScheme: ColorScheme = 'LIGHT',
  position: 'top' | 'bottom' | 'left' | 'right' = 'bottom'
): any {
  return {
    display: true,
    position,
    align: 'start',
    labels: {
      usePointStyle: true,
      padding: 16,
      font: {
        size: 12,
        family: 'Inter, sans-serif'
      },
      color: `rgb(${getTextColor(colorScheme)})`
    }
  };
}

/**
 * Create standardized grid configuration
 */
export function createGridConfig(
  colorScheme: ColorScheme = 'LIGHT',
  display: boolean = true
): any {
  return {
    display,
    color: `rgba(${getTextColor(colorScheme)}, 0.08)`,
    borderColor: `rgba(${getTextColor(colorScheme)}, 0.12)`,
    borderWidth: 1,
    tickLength: 8
  };
}

/**
 * Create standardized tick configuration
 */
export function createTickConfig(
  colorScheme: ColorScheme = 'LIGHT',
  fontSize: number = 11
): any {
  return {
    display: true,
    color: `rgb(${getTextColor(colorScheme)}`,
    padding: 8,
    font: {
      size: fontSize,
      family: 'Inter, sans-serif'
    }
  };
}

export function formatGroupedDate({
  date,
  groupBy
}: {
  date: Date;
  groupBy: GroupBy;
}) {
  if (groupBy === 'month') {
    return format(date, DATE_FORMAT_MONTHLY);
  } else if (groupBy === 'year') {
    return format(date, DATE_FORMAT_YEARLY);
  }

  return format(date, DATE_FORMAT);
}

export function getTooltipOptions({
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
} = {}) {
  return {
    backgroundColor: getBackgroundColor(colorScheme),
    bodyColor: `rgb(${getTextColor(colorScheme)})`,
    borderWidth: 1,
    borderColor: `rgba(${getTextColor(colorScheme)}, 0.1)`,
    callbacks: {
      label: (context) => {
        let label = context.dataset.label || '';
        if (label) {
          label += ': ';
        }
        if (context.parsed.y !== null) {
          if (currency) {
            label += `${context.parsed.y.toLocaleString(locale, {
              maximumFractionDigits: 2,
              minimumFractionDigits: 2
            })} ${currency}`;
          } else if (unit) {
            label += `${context.parsed.y.toFixed(2)} ${unit}`;
          } else {
            label += context.parsed.y.toFixed(2);
          }
        }
        return label;
      },
      title: (contexts) => {
        if (groupBy) {
          return formatGroupedDate({ groupBy, date: contexts[0].parsed.x });
        }

        return contexts[0].label;
      }
    },
    caretSize: 0,
    cornerRadius: 2,
    footerColor: `rgb(${getTextColor(colorScheme)})`,
    itemSort: (a, b) => {
      // Reverse order
      return b.datasetIndex - a.datasetIndex;
    },
    titleColor: `rgb(${getTextColor(colorScheme)})`,
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

export function getVerticalHoverLinePlugin(
  chartCanvas,
  colorScheme?: ColorScheme
) {
  return {
    afterDatasetsDraw: (chart, _, options) => {
      const active = chart.getActiveElements();

      if (!active || active.length === 0) {
        return;
      }

      const color = options.color || `rgb(${getTextColor(colorScheme)})`;
      const width = options.width || 1;

      const {
        chartArea: { bottom, top }
      } = chart;
      const xValue = active[0].element.x;

      const context = chartCanvas.nativeElement.getContext('2d');
      context.lineWidth = width;
      context.strokeStyle = color;

      context.beginPath();
      context.moveTo(xValue, top);
      context.lineTo(xValue, bottom);
      context.stroke();
    },
    id: 'verticalHoverLine'
  };
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
