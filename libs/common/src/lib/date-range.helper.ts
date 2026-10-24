import { DateRange } from '@ghostfolio/common/types';

import { differenceInYears } from 'date-fns';

/**
 * Returns the date ranges which are meaningful for a user depending on the
 * date of the first activity (e.g. `1y` requires at least one year of data).
 */
export function getAvailableDateRanges({
  dateOfFirstActivity,
  referenceDate = new Date()
}: {
  dateOfFirstActivity?: Date | string | null;
  referenceDate?: Date;
} = {}): DateRange[] {
  const yearsOfData = dateOfFirstActivity
    ? differenceInYears(referenceDate, new Date(dateOfFirstActivity))
    : 0;

  const dateRanges: DateRange[] = ['1d', 'wtd', 'mtd', 'ytd'];

  if (yearsOfData >= 1) {
    dateRanges.push('1y');
  }

  if (yearsOfData >= 5) {
    dateRanges.push('5y');
  }

  dateRanges.push('max');

  return dateRanges;
}

export const STORED_DATE_RANGE_KEY = 'gf-date-range';

/**
 * Returns the date range which has been selected last on this device
 * (e.g. `ytd` or a year like `2025`), if any.
 */
export function getStoredDateRange(storage?: Pick<Storage, 'getItem'>) {
  try {
    const value = (storage ?? globalThis.localStorage)?.getItem(
      STORED_DATE_RANGE_KEY
    );

    return value && /^(1d|wtd|mtd|ytd|1y|5y|max|\d{4})$/.test(value)
      ? (value as DateRange)
      : undefined;
  } catch {
    return undefined;
  }
}

export function saveStoredDateRange(
  dateRange: DateRange,
  storage?: Pick<Storage, 'setItem'>
) {
  try {
    (storage ?? globalThis.localStorage)?.setItem(
      STORED_DATE_RANGE_KEY,
      dateRange
    );
  } catch {}
}
