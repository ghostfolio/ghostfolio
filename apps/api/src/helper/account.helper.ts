import { TAG_ID_EXCLUDE_FROM_ANALYSIS } from '@ghostfolio/common/config';

import { Prisma } from '@prisma/client';
import { endOfToday, isAfter } from 'date-fns';

export const WHERE_ACCOUNT_NOT_EXCLUDED: Prisma.AccountWhereInput = {
  isExcluded: false,
  tags: {
    none: {
      tagId: TAG_ID_EXCLUDE_FROM_ANALYSIS
    }
  }
};

export function getWhereAccountBalanceNotInFuture(): Prisma.AccountBalanceWhereInput {
  return {
    date: { lte: endOfToday() }
  };
}

export function isAccountBalanceInFuture({
  date,
  endOfTodayDate = endOfToday()
}: {
  date: Date;
  endOfTodayDate?: Date;
}) {
  return isAfter(date, endOfTodayDate);
}
