import { UTCDate } from '@date-fns/utc';
import { Big } from 'big.js';
import {
  endOfDay,
  endOfYear,
  max,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMilliseconds,
  subYears
} from 'date-fns';
import { isFinite, isNumber } from 'lodash';

import { resetHours } from './helper';
import { DateRange } from './types';

export function getAnnualizedPerformancePercent({
  daysInMarket,
  netPerformancePercentage
}: {
  daysInMarket: number;
  netPerformancePercentage: Big;
}): Big {
  if (isNumber(daysInMarket) && daysInMarket > 0) {
    const exponent = new Big(365).div(daysInMarket).toNumber();
    const growthFactor = Math.pow(
      netPerformancePercentage.plus(1).toNumber(),
      exponent
    );

    if (isFinite(growthFactor)) {
      return new Big(growthFactor).minus(1);
    }
  }

  return new Big(0);
}

export function getIntervalFromDateRange(params: {
  dateRange: DateRange;
  endDate?: Date;
  startDate?: Date;
}) {
  const { dateRange } = params;
  let endDate = params.endDate ?? endOfDay(new Date());
  let startDate = params.startDate ?? new Date(0);

  switch (dateRange) {
    case '1d':
      startDate = max([startDate, subDays(resetHours(new Date()), 1)]);
      break;
    case 'mtd':
      startDate = max([
        startDate,
        subDays(startOfMonth(resetHours(new Date())), 1)
      ]);
      break;
    case 'wtd':
      startDate = max([
        startDate,
        subDays(startOfWeek(resetHours(new Date()), { weekStartsOn: 1 }), 1)
      ]);
      break;
    case 'ytd':
      startDate = max([
        startDate,
        subDays(startOfYear(resetHours(new Date())), 1)
      ]);
      break;
    case '1y':
      startDate = max([startDate, subYears(resetHours(new Date()), 1)]);
      break;
    case '5y':
      startDate = max([startDate, subYears(resetHours(new Date()), 5)]);
      break;
    case 'max':
      break;
    default: {
      // '2024', '2023', '2022', etc.
      const yearStartDate = new UTCDate(`${dateRange}-01-01`);

      // Derive the boundaries of the calendar year in UTC to be independent of
      // the server's time zone, but hand out plain dates as the consumers apply
      // local time zone semantics. As the start date is exclusive, the last
      // millisecond of the preceding year is used.
      endDate = new Date(endOfYear(yearStartDate).getTime());
      startDate = max([
        startDate,
        new Date(subMilliseconds(yearStartDate, 1).getTime())
      ]);
    }
  }

  return { endDate, startDate };
}
