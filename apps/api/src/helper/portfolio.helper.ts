import { resetHours } from '@ghostfolio/common/helper';
import { DateRange } from '@ghostfolio/common/types';

import { Type as ActivityType } from '@prisma/client';
import {
  endOfDay,
  max,
  subDays,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subYears,
  endOfYear
} from 'date-fns';

export function getFactor(activityType: ActivityType) {
  let factor: number;

  switch (activityType) {
    case 'BUY':
    case 'ITEM':
      factor = 1;
      break;
    case 'LIABILITY':
    case 'SELL':
      factor = -1;
      break;
    default:
      factor = 0;
      break;
  }

  return factor;
}

export function getInterval(
  aDateRange: DateRange,
  portfolioStart = new Date(0)
) {
  let endDate = endOfDay(new Date());
  let startDate = portfolioStart;

  switch (aDateRange) {
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
    default:
      // '2024', '2023', '2022', etc.
      endDate = endOfYear(new Date(aDateRange));
      startDate = max([startDate, new Date(aDateRange)]);
  }

  return { endDate, startDate };
}
