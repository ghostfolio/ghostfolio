import {
  NON_INVESTMENT_ACTIVITY_TYPES,
  TAG_ID_DRAFT
} from '@ghostfolio/common/config';

import { Prisma, Type as ActivityType } from '@prisma/client';
import { endOfToday, isAfter } from 'date-fns';
import { uniqBy } from 'lodash';

export const WHERE_ACTIVITY_NOT_DRAFT: Prisma.OrderWhereInput = {
  tags: {
    none: {
      id: TAG_ID_DRAFT
    }
  }
};

export function getTagsWithDraftTag<T extends { id: string }>({
  date,
  draftTag,
  endOfTodayDate = endOfToday(),
  storedDate,
  tags,
  type
}: {
  date: Date;
  draftTag: T;
  endOfTodayDate?: Date;
  storedDate?: Date;
  tags: T[];
  type: ActivityType;
}) {
  if (!isDraftTagToBeAssigned({ date, endOfTodayDate, storedDate, type })) {
    return tags;
  }

  return uniqBy([...tags, draftTag], 'id');
}

export function isActivityInFuture({
  date,
  endOfTodayDate = endOfToday()
}: {
  date: Date;
  endOfTodayDate?: Date;
}) {
  return isAfter(date, endOfTodayDate);
}

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

  if (!isActivityInFuture({ date, endOfTodayDate })) {
    return false;
  }

  // Assign only when the date newly moves into the future, so that a tag the
  // user has removed is not restored by an unrelated change
  return storedDate
    ? !isActivityInFuture({ endOfTodayDate, date: storedDate })
    : true;
}
