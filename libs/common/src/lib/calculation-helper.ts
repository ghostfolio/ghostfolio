import { Big } from 'big.js';
import {
  endOfDay,
  endOfYear,
  max,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subYears
} from 'date-fns';
import { isNumber } from 'lodash';

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

    return new Big(
      Math.pow(netPerformancePercentage.plus(1).toNumber(), exponent)
    ).minus(1);
  }

  return new Big(0);
}

export function getIntervalFromDateRange(
  aDateRange: DateRange,
  portfolioStart = new Date(0)
) {
  let endDate = endOfDay(new Date(Date.now()));
  let startDate = portfolioStart;

  switch (aDateRange) {
    case '1d':
      startDate = max([
        startDate,
        subDays(resetHours(new Date(Date.now())), 1)
      ]);
      break;
    case 'mtd':
      startDate = max([
        startDate,
        subDays(startOfMonth(resetHours(new Date(Date.now()))), 1)
      ]);
      break;
    case 'wtd':
      startDate = max([
        startDate,
        subDays(
          startOfWeek(resetHours(new Date(Date.now())), { weekStartsOn: 1 }),
          1
        )
      ]);
      break;
    case 'ytd':
      startDate = max([
        startDate,
        subDays(startOfYear(resetHours(new Date(Date.now()))), 1)
      ]);
      break;
    case '1y':
      startDate = max([
        startDate,
        subYears(resetHours(new Date(Date.now())), 1)
      ]);
      break;
    case '5y':
      startDate = max([
        startDate,
        subYears(resetHours(new Date(Date.now())), 5)
      ]);
      break;
    case 'max':
      break;
    default:
      // '2024', '2023', '2022', etc.
      endDate = endOfYear(new Date(aDateRange));
      startDate = max([startDate, new Date(aDateRange)]);
  }

  return { endDate, startDate };
}
