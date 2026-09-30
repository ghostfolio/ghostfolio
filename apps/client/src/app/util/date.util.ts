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
  date: string;
  language?: string;
}) {
  if (date) {
    const distanceString = formatDistanceToNowStrict(parseISO(date), {
      addSuffix: true,
      locale: getDateFnsLocale(language)
    });

    return Math.abs(differenceInSeconds(parseISO(date), new Date())) < 60
      ? $localize`just now`
      : distanceString;
  }

  return '';
}
