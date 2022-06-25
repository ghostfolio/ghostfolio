import { Platform } from '@angular/cdk/platform';
import { Inject, forwardRef } from '@angular/core';
import { MAT_DATE_LOCALE, NativeDateAdapter } from '@angular/material/core';
import { getDateFormatString } from '@ghostfolio/common/helper';
import { format, parse } from 'date-fns';

export class CustomDateAdapter extends NativeDateAdapter {
  public constructor(
    @Inject(MAT_DATE_LOCALE) public locale: string,
    @Inject(forwardRef(() => MAT_DATE_LOCALE)) matDateLocale: string,
    platform: Platform
  ) {
    super(matDateLocale, platform);
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
    return parse(aValue, getDateFormatString(this.locale), new Date());
  }
}
