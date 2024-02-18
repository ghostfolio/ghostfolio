import { getDateFormatString } from '@ghostfolio/common/helper';

import { Inject, forwardRef } from '@angular/core';
import { MAT_DATE_LOCALE, NativeDateAdapter } from '@angular/material/core';
import { addYears, format, getYear, parse } from 'date-fns';

export class CustomDateAdapter extends NativeDateAdapter {
  public constructor(
    @Inject(MAT_DATE_LOCALE) public locale: string,
    @Inject(forwardRef(() => MAT_DATE_LOCALE)) matDateLocale: string
  ) {
    super(matDateLocale);
  }

  /**
   * Formats a date as a string
   */
  public format(aDate: Date, aParseFormat: string): string {
    return format(aDate, getDateFormatString(this.locale));
  }

  /**
   * Sets the first day of the week to Monday
   */
  public getFirstDayOfWeek(): number {
    return 1;
  }

  /**
   * Parses a date from a provided value
   */
  public parse(aValue: string): Date {
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
