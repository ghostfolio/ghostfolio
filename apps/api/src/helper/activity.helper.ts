import { NON_INVESTMENT_ACTIVITY_TYPES } from '@ghostfolio/common/config';

import { Type as ActivityType } from '@prisma/client';
import { endOfToday, isAfter } from 'date-fns';

export function isDraftTagToBeAssigned({
  date,
  endOfTodayDate = endOfToday(),
  storedDate,
  type
}: {
  date: Date;
  endOfTodayDate?: Date;
  storedDate?: Date;
  type: ActivityType;
}) {
  if (NON_INVESTMENT_ACTIVITY_TYPES.includes(type)) {
    return false;
  }

  if (!isAfter(date, endOfTodayDate)) {
    return false;
  }

  // Assign only when the date newly moves into the future, so that a tag the
  // user has removed is not restored by an unrelated change
  return storedDate ? !isAfter(storedDate, endOfTodayDate) : true;
}
