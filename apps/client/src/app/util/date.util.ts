import { getDateFnsLocale } from '@ghostfolio/common/helper';

import {
  differenceInSeconds,
  formatDistanceToNowStrict,
  parseISO
} from 'date-fns';

export function formatRelativeTime({
  date,
  language
}: {
  date: Date | string;
  language?: string;
}) {
  if (date) {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    const distanceString = formatDistanceToNowStrict(parsedDate, {
      addSuffix: true,
      locale: getDateFnsLocale(language)
    });

    return Math.abs(differenceInSeconds(parsedDate, new Date())) < 60
      ? $localize`just now`
      : distanceString;
  }

  return '';
}
