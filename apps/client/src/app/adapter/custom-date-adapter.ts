import { getDateFormatString } from '@ghostfolio/common/helper';

import { inject, Service } from '@angular/core';
import { MAT_DATE_LOCALE, NativeDateAdapter } from '@angular/material/core';
import { addYears, format, getYear, parse } from 'date-fns';

@Service({ autoProvided: false })
export class CustomDateAdapter extends NativeDateAdapter {
  public override locale = inject<string>(MAT_DATE_LOCALE);

  /**
   * Formats a date as a string
   */
  public override format(aDate: Date): string {
    return format(aDate, getDateFormatString(this.locale));
  }

  /**
   * Sets the first day of the week to Monday
   */
  public override getFirstDayOfWeek(): number {
    return 1;
  }

  /**
   * Parses a date from a provided value
   */
  public override parse(aValue: string): Date {
    let date = parse(aValue, getDateFormatString(this.locale), new Date());

    if (getYear(date) < 1900) {
      if (getYear(date) > Number(format(new Date(), 'yy')) + 1) {
        date = addYears(date, 1900);
      } else {
        date = addYears(date, 2000);
      }
    }

    return date;
  }
}
