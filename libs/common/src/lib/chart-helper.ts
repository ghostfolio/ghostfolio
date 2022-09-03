import { Chart, TooltipPosition } from 'chart.js';

import { getBackgroundColor, getTextColor } from './helper';

export function getTooltipOptions({
  locale = '',
  unit = ''
}: {
  locale?: string;
  unit?: string;
} = {}) {
  return {
    backgroundColor: getBackgroundColor(),
    bodyColor: `rgb(${getTextColor()})`,
    borderWidth: 1,
    borderColor: `rgba(${getTextColor()}, 0.1)`,
    callbacks: {
      label: (context) => {
        let label = context.dataset.label || '';
        if (label) {
          label += ': ';
        }
        if (context.parsed.y !== null) {
          if (unit) {
            label += `${context.parsed.y.toLocaleString(locale, {
              maximumFractionDigits: 2,
              minimumFractionDigits: 2
            })} ${unit}`;
          } else {
            label += context.parsed.y.toFixed(2);
          }
        }
        return label;
      }
    },
    caretSize: 0,
    cornerRadius: 2,
    footerColor: `rgb(${getTextColor()})`,
    itemSort: (a, b) => {
      // Reverse order
      return b.datasetIndex - a.datasetIndex;
    },
    titleColor: `rgb(${getTextColor()})`,
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

export function getVerticalHoverLinePlugin(chartCanvas) {
  return {
    afterDatasetsDraw: (chart, x, options) => {
      const active = chart.getActiveElements();

      if (!active || active.length === 0) {
        return;
      }

      const color = options.color || `rgb(${getTextColor()})`;
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
