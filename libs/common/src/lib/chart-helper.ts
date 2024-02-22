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
    afterDatasetsDraw: (chart, x, options) => {
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
  if (value >= -999 && value <= 999) {
    return value.toString();
  } else if (value >= -999999 && value <= 999999) {
    return `${value / 1000}K`;
  } else {
    return `${value / 1000000}M`;
  }
}
