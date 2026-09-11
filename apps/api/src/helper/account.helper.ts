import { TAG_ID_EXCLUDE_FROM_ANALYSIS } from '@ghostfolio/common/config';
import { getStartOfUtcDateOfTomorrow } from '@ghostfolio/common/helper';

import { Prisma } from '@prisma/client';
import { isAfter } from 'date-fns';

export const WHERE_ACCOUNT_NOT_EXCLUDED: Prisma.AccountWhereInput = {
  tags: {
    none: {
      tagId: TAG_ID_EXCLUDE_FROM_ANALYSIS
    }
  }
};

/**
 * An account balance is stored with the time set to midnight in UTC. If the
 * user records it with the account balance dialog, the date is the local date
 * of the user, which can be one day ahead of the date in UTC. Therefore the
 * start of tomorrow in UTC is used as the limit, which covers the maximum
 * offset of a time zone (UTC+14:00).
 *
 * The instance does not know the time zone of the user, hence the limit applies
 * to all users. A balance which a user in a time zone behind UTC records for
 * tomorrow can show as the current balance for up to 24 hours.
 *
 * TODO: Use the time zone of the request (see HEADER_KEY_TIMEZONE) to calculate
 * the limit for each user
 */
export function getWhereAccountBalanceNotInFuture(): Prisma.AccountBalanceWhereInput {
  return {
    date: { lte: getStartOfUtcDateOfTomorrow() }
  };
}

export function isAccountBalanceInFuture({
  date,
  startOfUtcDateOfTomorrow = getStartOfUtcDateOfTomorrow()
}: {
  date: Date;
  startOfUtcDateOfTomorrow?: Date;
}) {
  return isAfter(date, startOfUtcDateOfTomorrow);
}
