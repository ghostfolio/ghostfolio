import type { HistoricalDataItem } from '@ghostfolio/common/interfaces';

export interface PnlCalendarDay {
  date: string;
  amount?: number;
  percentagePoints?: number;
}

export interface PnlCalendarPeriod {
  amount?: number;
  endDate: string;
  percentagePoints?: number;
  startDate: string;
}

// Work on ISO calendar dates, not local instants: DST must not change the day.
export function addCalendarDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const result = new Date(Date.UTC(year, month - 1, day + days));

  return result.toISOString().slice(0, 10);
}

/** Current local calendar date, independent of UTC rollover. */
export function getLocalTodayKey(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getMonday(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  return addCalendarDays(date, -((weekday + 6) % 7));
}

/**
 * The portfolio performance chart contains cumulative values for its range.
 * Their differences give the period's monetary PnL and the CHANGE in the
 * cumulative return (percentage points), not a period's investment return.
 * Do not replace the latter with a "daily return" label: ROAI and other
 * non-time-weighted methods cannot be chained that way.
 */
export function getPnlCalendarDays(
  chart: HistoricalDataItem[]
): PnlCalendarDay[] {
  const items = [...chart]
    .filter(({ date }) => /^\d{4}-\d{2}-\d{2}$/.test(date))
    .sort((a, b) => a.date.localeCompare(b.date));
  const days: PnlCalendarDay[] = [];

  for (let index = 1; index < items.length; index++) {
    const current = items[index];
    const previous = items[index - 1];

    // A multi-day delta is not a daily PnL: do not assign it to the last day.
    if (current.date !== addCalendarDays(previous.date, 1)) {
      continue;
    }

    const amount = differenceOrUndefined(
      current.netPerformanceWithCurrencyEffect,
      previous.netPerformanceWithCurrencyEffect
    );
    const percentagePoints = differenceOrUndefined(
      current.netPerformanceInPercentageWithCurrencyEffect,
      previous.netPerformanceInPercentageWithCurrencyEffect
    );

    if (amount !== undefined || percentagePoints !== undefined) {
      days.push({
        amount,
        date: current.date,
        percentagePoints:
          percentagePoints === undefined ? undefined : percentagePoints * 100
      });
    }
  }

  return days;
}

export function aggregatePnlCalendarDays({
  days,
  endDate,
  startDate,
  requireComplete = false,
  asOfDate = getLocalTodayKey(),
  firstHistoricalDate
}: {
  days: PnlCalendarDay[];
  endDate: string;
  startDate: string;
  requireComplete?: boolean;
  asOfDate?: string;
  firstHistoricalDate?: string;
}): PnlCalendarPeriod {
  let amount: number | undefined;
  let percentagePoints: number | undefined;

  for (const day of days) {
    if (day.date < startDate || day.date > endDate) {
      continue;
    }

    if (day.amount !== undefined) {
      amount = (amount ?? 0) + day.amount;
    }

    if (day.percentagePoints !== undefined) {
      percentagePoints = (percentagePoints ?? 0) + day.percentagePoints;
    }
  }

  // A partial monetary sum must not be presented as a full period result.
  // Ignore future dates, but require one finite monetary observation for
  // every elapsed calendar day in a complete-period aggregation.
  if (requireComplete) {
    const lastRequiredDate = endDate < asOfDate ? endDate : asOfDate;
    const observed = new Set(
      days
        .filter(
          ({ amount: value, date }) =>
            typeof value === 'number' &&
            Number.isFinite(value) &&
            date >= startDate &&
            date <= lastRequiredDate
        )
        .map(({ date }) => date)
    );
    // Before the first observable daily PnL there is no return to report.
    // Do not mistake that pre-history for a gap inside the observed series.
    // A missing observation AFTER the first day still invalidates the total.
    const firstObservedDate = days
      .filter(
        ({ amount: value, date }) =>
          typeof value === 'number' &&
          Number.isFinite(value) &&
          date <= lastRequiredDate
      )
      .map(({ date }) => date)
      .sort()[0];
    // Only a known start of the underlying chart can justify trimming
    // pre-history. The first monetary observation alone is not evidence
    // of inception: it might follow an unobserved data gap.
    const effectiveStart =
      firstHistoricalDate &&
      firstHistoricalDate >= startDate &&
      firstObservedDate &&
      firstObservedDate > startDate
        ? firstObservedDate
        : startDate;
    let isComplete =
      Boolean(firstObservedDate) && effectiveStart <= lastRequiredDate;
    for (
      let date = effectiveStart;
      isComplete && date <= lastRequiredDate;
      date = addCalendarDays(date, 1)
    ) {
      if (!observed.has(date)) {
        isComplete = false;
      }
    }
    if (!isComplete) {
      amount = undefined;
    }
  }

  return {
    amount,
    endDate,
    percentagePoints,
    startDate
  };
}

/** Aggregate only the portion of an ISO Monday-Sunday week in the selected month. */
export function aggregatePnlCalendarWeekInMonth({
  days,
  monthEnd,
  monthStart,
  weekStart,
  requireComplete = false,
  asOfDate,
  firstHistoricalDate
}: {
  days: PnlCalendarDay[];
  monthEnd: string;
  monthStart: string;
  weekStart: string;
  requireComplete?: boolean;
  asOfDate?: string;
  firstHistoricalDate?: string;
}): PnlCalendarPeriod {
  const weekEnd = addCalendarDays(weekStart, 6);

  return aggregatePnlCalendarDays({
    days,
    startDate: weekStart < monthStart ? monthStart : weekStart,
    endDate: weekEnd > monthEnd ? monthEnd : weekEnd,
    requireComplete,
    asOfDate,
    firstHistoricalDate
  });
}

function differenceOrUndefined(
  current: number | undefined,
  previous: number | undefined
): number | undefined {
  return typeof current === 'number' &&
    Number.isFinite(current) &&
    typeof previous === 'number' &&
    Number.isFinite(previous)
    ? current - previous
    : undefined;
}
