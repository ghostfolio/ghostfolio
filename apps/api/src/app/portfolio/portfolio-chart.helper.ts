import { DATE_FORMAT, parseDate } from '@ghostfolio/common/helper';
import { HistoricalDataItem } from '@ghostfolio/common/interfaces';

import { format, isSameYear, set } from 'date-fns';

/**
 * Groups chart data by year, providing one entry per year.
 * For each year, the last available data point is used as the representative value.
 * Dates are normalized to YYYY-01-01 format.
 */
export function getChartByYear(
  chart: HistoricalDataItem[]
): HistoricalDataItem[] {
  if (!chart?.length) {
    return [];
  }

  const chartByYear: HistoricalDataItem[] = [];
  let currentDate: Date | null = null;

  for (const dataPoint of chart) {
    const date = parseDate(dataPoint.date);

    if (!isSameYear(date, currentDate)) {
      // New year: Push a new entry with normalized date (YYYY-01-01)
      chartByYear.push({
        ...dataPoint,
        date: format(set(date, { date: 1, month: 0 }), DATE_FORMAT)
      });
      currentDate = date;
    } else {
      // Same year: Update the last entry with latest data (keep normalized date)
      const normalizedDate = chartByYear[chartByYear.length - 1].date;
      chartByYear[chartByYear.length - 1] = {
        ...dataPoint,
        date: normalizedDate
      };
    }
  }

  return chartByYear;
}
