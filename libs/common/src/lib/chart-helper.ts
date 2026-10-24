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
import { addDays, format, startOfWeek } from 'date-fns';

import { secondaryColorRgb } from './config';
import {
  DATE_FORMAT,
  DATE_FORMAT_MONTHLY,
  DATE_FORMAT_YEARLY,
  getBackgroundColor,
  getDateFormatString,
  getLocale,
  getTextColor,
  parseDate
} from './helper';
import { ColorScheme, DateRange, GroupBy } from './types';

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

// Colors for the lines of the compared benchmarks, the portfolio uses the
// primary color
// Without green and red, which stand for a gain and a loss, and without the
// primary color of the portfolio. Orange (close to red) comes last
const BENCHMARK_COLORS = [
  `rgb(${secondaryColorRgb.r}, ${secondaryColorRgb.g}, ${secondaryColorRgb.b})`,
  'rgb(153, 102, 255)',
  'rgb(201, 162, 39)',
  'rgb(160, 160, 170)',
  'rgb(255, 159, 64)'
];

export function getBenchmarkColor(index: number) {
  return BENCHMARK_COLORS[index % BENCHMARK_COLORS.length];
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

/**
 * Returns the unit of the ticks of the time axis, so that the labels fit the
 * length of the date range: days up to a month, months up to a year and years
 * above
 */
/**
 * Returns the daily items of the trading days (Monday to Friday) and, for a
 * date range with a fixed end (the current year), the remaining trading days
 * without a value, so that the chart shows the whole period
 */
function getWeekKey(aDate?: Date) {
  return aDate
    ? format(startOfWeek(aDate, { weekStartsOn: 1 }), DATE_FORMAT)
    : '';
}

export function getTradingDayItems<T extends { date: string }>({
  dateRange,
  items,
  maxItems = 400,
  now = new Date()
}: {
  dateRange?: DateRange;
  items: T[];
  /** Above, one point per week (the last trading day) is kept */
  maxItems?: number;
  now?: Date;
}): (T | { date: string; value: null })[] {
  const isWeekend = (aDate: Date) => {
    return aDate.getDay() === 0 || aDate.getDay() === 6;
  };

  const result: (T | { date: string; value: null })[] = items.filter(
    ({ date }) => {
      const parsedDate = parseDate(date);

      return !parsedDate || !isWeekend(parsedDate);
    }
  );

  if (result.length > maxItems) {
    const weekly = result.filter(({ date }, index) => {
      const next = result[index + 1];

      return (
        index === 0 ||
        !next ||
        getWeekKey(parseDate(date)) !== getWeekKey(parseDate(next.date))
      );
    });

    result.splice(0, result.length, ...weekly);
  }

  let end: Date | undefined;
  let start: Date | undefined;

  if (dateRange === 'ytd') {
    end = new Date(now.getFullYear(), 11, 31);
    start = new Date(now.getFullYear(), 0, 1);
  } else if (/^\d{4}$/.test(dateRange ?? '')) {
    end = new Date(Number(dateRange), 11, 31);
    start = new Date(Number(dateRange), 0, 1);
  }

  const firstDate = result[0] ? parseDate(result[0].date) : undefined;

  if (start && firstDate && firstDate < start) {
    // The baseline (the close of the previous year) is shown at the start
    result[0] = { ...result[0], date: format(start, DATE_FORMAT) };
  }

  const lastDate = items.at(-1)?.date;
  const last = lastDate ? parseDate(lastDate) : undefined;

  if (end && last) {
    for (
      let date = addDays(last, 1);
      date.getTime() <= end.getTime();
      date = addDays(date, 1)
    ) {
      if (!isWeekend(date)) {
        result.push({ date: format(date, DATE_FORMAT), value: null });
      }
    }
  }

  return result;
}

export function getTimeAxisUnit(
  aDateRange?: DateRange
): 'day' | 'hour' | 'month' | 'year' | false {
  switch (aDateRange) {
    case undefined:
      return 'year';
    case '1d':
      return 'hour';
    case 'mtd':
    case 'wtd':
      return 'day';
    case '1y':
    case '5y':
    case 'max':
      // Chosen by the chart according to the length of the period
      return false;
    default:
      // 'ytd' and single years
      return 'month';
  }
}

const TIME_SERIES_LABEL_FORMATS = {
  day: 'EEE d',
  hour: 'HH:mm',
  month: 'MMM',
  year: 'yyyy'
} as const;

/**
 * Returns the labels of an axis with equidistant points (without the closed
 * markets): a label at the first point of a period (hour, day, month or
 * year), thinned out to at most a few labels
 */
export function getTimeSeriesTickCallback(
  aUnit: 'day' | 'hour' | 'month' | 'year' | false,
  aMaxLabels = 7
) {
  let cache: { key: string; labels: Map<number, string> } | undefined;

  return (
    _value: number | string,
    index: number,
    ticks: { value: number }[]
  ) => {
    const key = `${ticks.length}-${ticks[0]?.value}-${ticks.at(-1)?.value}`;

    if (cache?.key !== key) {
      const span = (ticks.at(-1)?.value ?? 0) - (ticks[0]?.value ?? 0);
      const unit =
        aUnit ||
        (span > 3 * 365 * 24 * 60 * 60 * 1000
          ? 'year'
          : span > 45 * 24 * 60 * 60 * 1000
            ? 'month'
            : 'day');

      const getPeriod = (aTime: number) => {
        const date = new Date(aTime);

        switch (unit) {
          case 'hour':
            return `${date.toDateString()} ${date.getHours()}`;
          case 'month':
            return `${date.getFullYear()}-${date.getMonth()}`;
          default:
            return `${date.getFullYear()}`;
        }
      };

      // The first point of each period
      const starts: number[] = [];

      ticks.forEach(({ value }, tickIndex) => {
        const previous = ticks[tickIndex - 1]?.value;

        if (
          tickIndex === 0 ||
          (unit === 'day'
            ? // A trading day starts after the closed market (the post-market
              // can last after midnight)
              value - previous > 2 * 60 * 60 * 1000
            : getPeriod(value) !== getPeriod(previous))
        ) {
          starts.push(tickIndex);
        }
      });

      const step = Math.max(1, Math.ceil(starts.length / aMaxLabels));
      const labels = new Map<number, string>();

      starts.forEach((tickIndex, startIndex) => {
        if (startIndex % step === 0) {
          labels.set(
            tickIndex,
            format(ticks[tickIndex].value, TIME_SERIES_LABEL_FORMATS[unit])
          );
        }
      });

      cache = { key, labels };
    }

    return cache.labels.get(index) ?? '';
  };
}

export function getTimeAxisOptions({
  borderWidth = 1,
  colorScheme,
  display = true,
  locale = getLocale(),
  type = 'time',
  unit = 'year',
  withTime = false
}: {
  borderWidth?: number;
  colorScheme?: ColorScheme;
  display?: boolean;
  locale?: string;
  type?: 'time' | 'timeseries';
  unit?: 'day' | 'hour' | 'month' | 'year' | false;
  /** Whether the points are intraday (the tooltip shows the time) */
  withTime?: boolean;
}): ScaleOptions<'time' | 'timeseries'> {
  return {
    display,
    border: {
      color: getChartBorderColor(colorScheme),
      width: borderWidth
    },
    grid: {
      display: false
    },
    ticks:
      type === 'timeseries'
        ? {
            // A label at the first point of an hour, day, month or year
            autoSkip: false,
            callback: getTimeSeriesTickCallback(unit),
            maxRotation: 0,
            source: 'data'
          }
        : {
            autoSkip: true,
            maxRotation: 0,
            maxTicksLimit: 6
          },
    time: {
      tooltipFormat: withTime
        ? unit === 'hour'
          ? 'HH:mm'
          : `${getDateFormatString(locale)} HH:mm`
        : getDateFormatString(locale),
      displayFormats: {
        day: 'EEE d',
        hour: 'HH:mm',
        month: unit === 'month' ? 'MMM' : 'MMM yy',
        week: 'd MMM',
        year: 'yyyy'
      },
      unit
    },
    type
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

export function getZeroLineAnnotation(
  colorScheme?: ColorScheme
): AnnotationOptions<'line'> {
  return {
    borderColor: getChartBorderColor(colorScheme),
    borderWidth: 1,
    scaleID: 'y',
    type: 'line',
    value: 0
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
